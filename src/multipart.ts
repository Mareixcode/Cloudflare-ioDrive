import type { Env, UploadPart, UploadLogEntry } from './types';
import type { S3Config } from './s3-upload';
import { s3AbortMultipart, s3CompleteMultipart, s3CreateMultipart, s3UploadPart } from './s3-upload';
import type { StorageEngine } from './storage-engine';
import { createMetadataStore } from './metadata-store';
import { getAllS3ConfigsAsync } from './storage';
import { assertSafeStorageKey } from './storage-path';

const MULTIPART_PREFIX = '_multipart/';
const MAX_PART_SIZE = 25 * 1024 * 1024;

export interface MultipartMetadata {
  key: string;
  filename: string;
  created: string;
  syncUploadIds: Record<string, string>;
  // Compatibility with sessions created by older releases.
  s3UploadIds?: Record<string, string>;
  source?: UploadLogEntry['source'];
  uploadKeyId?: string;
  uploadKeyLabel?: string;
}

function metadataKey(uploadId: string): string {
  return MULTIPART_PREFIX + uploadId;
}

function partPrefix(uploadId: string): string {
  return metadataKey(uploadId) + '/parts/';
}

function syncPartKey(uploadId: string, config: S3Config, partNumber: number): string {
  return `${partPrefix(uploadId)}${encodeURIComponent(backendId(config))}/${partNumber}`;
}

function backendId(config: S3Config): string {
  return `${config.endpoint}/${config.bucket}`;
}

async function getSyncConfigs(env: Env, engine: StorageEngine): Promise<S3Config[]> {
  const configs = await getAllS3ConfigsAsync(env);
  return engine.kind === 'r2' ? configs : configs.slice(1);
}

async function getPrimaryUploadId(env: Env, engine: StorageEngine, metadata: MultipartMetadata, uploadId: string): Promise<string> {
  if (engine.kind !== 's3' || !metadata.s3UploadIds) return uploadId;
  const primary = (await getAllS3ConfigsAsync(env))[0];
  return primary ? metadata.s3UploadIds[primary.bucket] || uploadId : uploadId;
}

function getSyncUploadId(metadata: MultipartMetadata, config: S3Config): string | undefined {
  return metadata.syncUploadIds?.[backendId(config)] || metadata.s3UploadIds?.[config.bucket];
}

async function loadMultipartMetadata(env: Env, uploadId: string): Promise<MultipartMetadata> {
  const metadata = await createMetadataStore(env).get<MultipartMetadata>(metadataKey(uploadId));
  if (!metadata) throw new Error('分片上传会话不存在或已过期');
  return metadata;
}

async function deleteMultipartState(env: Env, uploadId: string): Promise<void> {
  const meta = createMetadataStore(env);
  const prefix = partPrefix(uploadId);
  let cursor: string | undefined;
  do {
    const page = await meta.list(prefix, { limit: 1000, cursor });
    if (page.keys.length) await meta.delete(page.keys);
    cursor = page.cursor;
  } while (cursor);
  await meta.delete(metadataKey(uploadId));
}

function validateParts(parts: UploadPart[]): UploadPart[] {
  if (!Array.isArray(parts) || parts.length === 0 || parts.length > 10_000) {
    throw new Error('分片列表无效');
  }
  const sorted = [...parts].sort((a, b) => a.partNumber - b.partNumber);
  const seen = new Set<number>();
  for (const part of sorted) {
    if (!Number.isInteger(part.partNumber) || part.partNumber < 1 || part.partNumber > 10_000 || typeof part.etag !== 'string' || !part.etag || seen.has(part.partNumber)) {
      throw new Error('分片列表无效');
    }
    seen.add(part.partNumber);
  }
  return sorted;
}

export async function startMultipartUpload(
  env: Env,
  engine: StorageEngine,
  key: string,
  filename: string,
  contentType: string,
  extra: Pick<MultipartMetadata, 'source' | 'uploadKeyId' | 'uploadKeyLabel'> = {},
): Promise<string> {
  assertSafeStorageKey(key);
  const primary = await engine.createMultipartUpload(key, { contentType });
  const createdSync: Array<{ config: S3Config; uploadId: string }> = [];

  try {
    for (const config of await getSyncConfigs(env, engine)) {
      const uploadId = await s3CreateMultipart(config, key, contentType);
      if (!uploadId) throw new Error(`无法初始化同步存储 ${config.bucket}`);
      createdSync.push({ config, uploadId });
    }

    const syncUploadIds = Object.fromEntries(
      createdSync.map(({ config, uploadId }) => [backendId(config), uploadId]),
    );
    await createMetadataStore(env).put(metadataKey(primary.uploadId), {
      key,
      filename,
      created: new Date().toISOString(),
      syncUploadIds,
      ...extra,
    } satisfies MultipartMetadata);
    return primary.uploadId;
  } catch (error) {
    await Promise.allSettled([
      primary.abort(),
      ...createdSync.map(({ config, uploadId }) => s3AbortMultipart(config, key, uploadId)),
    ]);
    throw error;
  }
}

export async function uploadMultipartPart(
  env: Env,
  engine: StorageEngine,
  uploadId: string,
  key: string,
  partNumber: number,
  data: ArrayBuffer,
): Promise<UploadPart> {
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000) {
    throw new Error('分片编号无效');
  }
  if (data.byteLength === 0 || data.byteLength > MAX_PART_SIZE) {
    throw new Error('分片大小无效');
  }

  const metadata = await loadMultipartMetadata(env, uploadId);
  if (metadata.key !== key) throw new Error('分片上传路径不匹配');
  assertSafeStorageKey(metadata.key);

  const primaryUploadId = await getPrimaryUploadId(env, engine, metadata, uploadId);
  const primaryPart = await engine.resumeMultipartUpload(metadata.key, primaryUploadId).uploadPart(partNumber, data);
  const meta = createMetadataStore(env);
  for (const config of await getSyncConfigs(env, engine)) {
    const syncUploadId = getSyncUploadId(metadata, config);
    if (!syncUploadId) continue;
    const etag = await s3UploadPart(config, metadata.key, syncUploadId, partNumber, data);
    if (!etag) throw new Error(`同步存储 ${config.bucket} 的分片上传失败`);
    await meta.put(syncPartKey(uploadId, config, partNumber), { partNumber, etag } satisfies UploadPart);
  }
  return primaryPart;
}

export async function completeMultipartUpload(
  env: Env,
  engine: StorageEngine,
  uploadId: string,
  key: string,
  parts: UploadPart[],
): Promise<{ object: { key: string; size: number }; metadata: MultipartMetadata; syncFailures: string[] }> {
  const metadata = await loadMultipartMetadata(env, uploadId);
  if (metadata.key !== key) throw new Error('分片上传路径不匹配');
  assertSafeStorageKey(metadata.key);
  const validatedParts = validateParts(parts);

  const primaryUploadId = await getPrimaryUploadId(env, engine, metadata, uploadId);
  const object = await engine.resumeMultipartUpload(metadata.key, primaryUploadId).complete(validatedParts);
  const syncFailures: string[] = [];
  const meta = createMetadataStore(env);
  for (const config of await getSyncConfigs(env, engine)) {
    const syncUploadId = getSyncUploadId(metadata, config);
    if (!syncUploadId) continue;
    try {
      const syncParts = await Promise.all(
        validatedParts.map(part => meta.get<UploadPart>(syncPartKey(uploadId, config, part.partNumber))),
      );
      if (metadata.syncUploadIds?.[backendId(config)] && syncParts.some(part => !part)) {
        throw new Error(`同步存储 ${config.bucket} 缺少分片元数据`);
      }
      const completedParts = syncParts.map((part, index) => part || validatedParts[index]);
      const completed = await s3CompleteMultipart(config, metadata.key, syncUploadId, completedParts);
      if (!completed) throw new Error(`同步存储 ${config.bucket} 合并失败`);
    } catch {
      syncFailures.push(config.bucket);
      await s3AbortMultipart(config, metadata.key, syncUploadId).catch(() => false);
    }
  }

  // Older S3 sessions created an unused primary upload before recording the
  // actual primary S3 upload ID. Abort that orphan after the real upload ends.
  if (primaryUploadId !== uploadId) {
    await engine.resumeMultipartUpload(metadata.key, uploadId).abort().catch(() => undefined);
  }

  await deleteMultipartState(env, uploadId);
  return { object, metadata, syncFailures };
}

export async function abortMultipartUpload(
  env: Env,
  engine: StorageEngine,
  uploadId: string,
  key: string,
): Promise<void> {
  const meta = createMetadataStore(env);
  const metadata = await meta.get<MultipartMetadata>(metadataKey(uploadId));
  if (!metadata) return;
  if (metadata.key !== key) throw new Error('分片上传路径不匹配');

  const primaryUploadId = await getPrimaryUploadId(env, engine, metadata, uploadId);
  const tasks: Array<Promise<unknown>> = [engine.resumeMultipartUpload(metadata.key, primaryUploadId).abort()];
  if (primaryUploadId !== uploadId) {
    tasks.push(engine.resumeMultipartUpload(metadata.key, uploadId).abort());
  }
  for (const config of await getSyncConfigs(env, engine)) {
    const syncUploadId = getSyncUploadId(metadata, config);
    if (syncUploadId) tasks.push(s3AbortMultipart(config, metadata.key, syncUploadId));
  }
  await Promise.allSettled(tasks);
  await deleteMultipartState(env, uploadId);
}
