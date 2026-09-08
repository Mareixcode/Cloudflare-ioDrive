import { Hono } from 'hono';
import type { Env, UploadPart } from './types';
import { jwtAuth } from './auth';
import { getContentType, uniqueKey } from './upload-utils';
import { writeUploadLog } from './upload-logs';
import { getAllS3ConfigsAsync } from './storage';
import { createStorageEngine } from './storage-engine';
import { moderateAndCleanup } from './moderation';
import { s3PutObject } from './s3-upload';
import { clearFileCache } from './cache';
import { abortMultipartUpload, completeMultipartUpload, startMultipartUpload, uploadMultipartPart } from './multipart';
import { errorMessage } from './errors';
import { normalizeUploadDirectory } from './storage-path';

export const uploadRoutes = new Hono<{ Bindings: Env }>();
const SINGLE_UPLOAD_LIMIT = 20 * 1024 * 1024;

uploadRoutes.use('*', jwtAuth);

// ── Single file upload (primary + all sync backends) ──

uploadRoutes.post('/single', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  let path: string;
  try {
    path = normalizeUploadDirectory(typeof body['path'] === 'string' ? body['path'] : 'uploads/');
  } catch {
    return c.json({ error: '上传路径无效' }, 400);
  }

  if (!file || !(file instanceof File)) {
    return c.json({ error: '缺少文件' }, 400);
  }
  if (file.size > SINGLE_UPLOAD_LIMIT) {
    return c.json({ error: '单文件上传不能超过 20MB，请使用分片上传' }, 413);
  }

  const engine = await createStorageEngine(c.env);
  const key = await uniqueKey(engine, path, file.name);
  const contentType = file.type || 'application/octet-stream';
  const buf = await file.arrayBuffer();

  // Primary upload
  await engine.put(key, buf, { contentType });

  // Sync to other S3 backends（主后端已通过 engine.put 写入）
  const s3Cfgs = await getAllS3ConfigsAsync(c.env);
  const syncCfgs = engine.kind === 'r2' ? s3Cfgs : s3Cfgs.slice(1);
  let s3Ok = false;
  for (const s3cfg of syncCfgs) {
    try {
      const ok = await s3PutObject(s3cfg, key, buf, contentType);
      if (ok) s3Ok = true;
    } catch (e) { console.error('S3 upload error:', e); }
  }

  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key, name: file.name, size: file.size,
      ip: c.req.header('CF-Connecting-IP') || '',
      country: c.req.header('CF-IPCountry') || '',
      ua: c.req.header('User-Agent') || '',
      referer: c.req.header('Referer') || '',
      source: 'dashboard',
    }),
  );

  // 异步内容审核（写后审）
  c.executionCtx.waitUntil(
    moderateAndCleanup(c.env, {
      key, name: file.name, size: file.size,
      contentType,
      ip: c.req.header('CF-Connecting-IP') || '',
      ua: c.req.header('User-Agent') || '',
      source: 'dashboard',
    }),
  );

  // 清除对应的 KV 缓存
  c.executionCtx.waitUntil(clearFileCache(c.env, '', key));

  return c.json({ ok: true, key, name: file.name, s3: s3Ok });
});

// ── Init multipart upload ──

uploadRoutes.post('/init', async (c) => {
  const body = await c.req.json<{ filename: string; size: number; path?: string }>();
  const { filename, size } = body;
  let path: string;
  try {
    path = normalizeUploadDirectory(body.path || 'uploads/');
  } catch {
    return c.json({ error: '上传路径无效' }, 400);
  }

  if (!filename) return c.json({ error: '缺少文件名' }, 400);
  if (!Number.isFinite(size) || size <= 0) return c.json({ error: '文件大小无效' }, 400);

  const engine = await createStorageEngine(c.env);
  const key = await uniqueKey(engine, path, filename);
  const contentType = getContentType(filename);

  const uploadId = await startMultipartUpload(c.env, engine, key, filename, contentType, { source: 'dashboard' });
  return c.json({ uploadId, key });
});

// ── Upload part ──

uploadRoutes.post('/part', async (c) => {
  const body = await c.req.parseBody();
  const uploadId = body['uploadId'] as string;
  const key = body['key'] as string;
  const partNumber = parseInt(body['partNumber'] as string, 10);
  const chunk = body['chunk'];

  if (!uploadId || !key || !partNumber || !chunk) return c.json({ error: '缺少参数' }, 400);
  if (!(chunk instanceof File)) return c.json({ error: '无效的文件数据' }, 400);

  const engine = await createStorageEngine(c.env);
  const chunkBuf = await chunk.arrayBuffer();
  try {
    const partResult = await uploadMultipartPart(c.env, engine, uploadId, key, partNumber, chunkBuf);
    return c.json(partResult);
  } catch (error) {
    return c.json({ error: errorMessage(error, '分片上传失败') }, 400);
  }
});

// ── Complete multipart upload ──

uploadRoutes.post('/complete', async (c) => {
  const body = await c.req.json<{ uploadId: string; key: string; parts: UploadPart[] }>();
  const { uploadId, key, parts } = body;

  if (!uploadId || !key || !parts?.length) return c.json({ error: '缺少参数' }, 400);

  const engine = await createStorageEngine(c.env);
  let completed: Awaited<ReturnType<typeof completeMultipartUpload>>;
  try {
    completed = await completeMultipartUpload(c.env, engine, uploadId, key, parts);
  } catch (error) {
    return c.json({ error: errorMessage(error, '完成分片上传失败') }, 400);
  }
  const { object, metadata, syncFailures } = completed;

  // S3 complete 后获取实际文件大小
  if (object.size === 0) {
    try {
      const head = await engine.head(key);
      if (head) object.size = head.size;
    } catch {}
  }

  const name = key.split('/').pop() || key;
  const filename = metadata.filename || name;
  const contentType = getContentType(filename) || 'application/octet-stream';
  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key, name, size: object.size,
      ip: c.req.header('CF-Connecting-IP') || '',
      country: c.req.header('CF-IPCountry') || '',
      ua: c.req.header('User-Agent') || '',
      referer: c.req.header('Referer') || '',
      source: 'dashboard',
    }),
  );

  c.executionCtx.waitUntil(
    moderateAndCleanup(c.env, {
      key, name, size: object.size, contentType,
      ip: c.req.header('CF-Connecting-IP') || '',
      ua: c.req.header('User-Agent') || '',
      source: 'dashboard',
    }),
  );

  // 清除对应的 KV 缓存
  c.executionCtx.waitUntil(clearFileCache(c.env, '', key));

  return c.json({ ok: true, key: object.key, name, syncFailures });
});

// ── Abort ──

uploadRoutes.post('/abort', async (c) => {
  const body = await c.req.json<{ uploadId: string; key: string }>();
  const { uploadId, key } = body;

  if (!uploadId || !key) return c.json({ error: '缺少参数' }, 400);

  const engine = await createStorageEngine(c.env);
  await abortMultipartUpload(c.env, engine, uploadId, key);

  return c.json({ ok: true });
});
