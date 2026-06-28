import { Hono } from 'hono';
import type { Env, UploadPart } from './types';
import { jwtAuth } from './auth';
import { getContentType, uniqueKey } from './upload-utils';
import { writeUploadLog } from './upload-logs';
import { getAllS3ConfigsAsync } from './storage';
import { createStorageEngine } from './storage-engine';

export const uploadRoutes = new Hono<{ Bindings: Env }>();

uploadRoutes.use('*', jwtAuth);

// ── Single file upload (primary + all sync backends) ──

uploadRoutes.post('/single', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  const path = (body['path'] as string) || 'uploads/';

  if (!file || !(file instanceof File)) {
    return c.json({ error: '缺少文件' }, 400);
  }

  const engine = await createStorageEngine(c.env);
  const key = c.env.DRIVE
    ? await uniqueKey(c.env.DRIVE, path, file.name)
    : path + file.name;
  const contentType = file.type || 'application/octet-stream';
  const buf = await file.arrayBuffer();

  // Primary upload
  await engine.put(key, buf, { contentType });

  // Sync to all S3 backends
  const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
  let s3Ok = false;
  for (const s3cfg of s3Cfgs) {
    try {
      const { s3PutObject } = await import('./s3-upload');
      const ok = await s3PutObject(s3cfg, key, buf, contentType);
      if (ok) s3Ok = true;
    } catch (e) { console.error('S3 upload error:', e); }
  }

  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key,
      name: file.name,
      size: file.size,
      ip: c.req.header('CF-Connecting-IP') || '',
      country: c.req.header('CF-IPCountry') || '',
      ua: c.req.header('User-Agent') || '',
      referer: c.req.header('Referer') || '',
      source: 'dashboard',
    }),
  );

  return c.json({ ok: true, key, name: file.name, s3: s3Ok });
});

// ── Init multipart upload (primary + all sync backends) ──

uploadRoutes.post('/init', async (c) => {
  const body = await c.req.json<{ filename: string; size: number; path?: string }>();
  const { filename } = body;
  const path = body.path || 'uploads/';

  if (!filename) return c.json({ error: '缺少文件名' }, 400);

  const engine = await createStorageEngine(c.env);
  const key = c.env.DRIVE
    ? await uniqueKey(c.env.DRIVE, path, filename)
    : path + filename;
  const contentType = getContentType(filename);

  // Primary init
  const mp = await engine.createMultipartUpload(key, { contentType });

  // S3 init (store mapping)
  const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
  const s3UploadIds: Record<string, string> = {};
  const { s3CreateMultipart } = await import('./s3-upload');
  for (const s3cfg of s3Cfgs) {
    const s3Uid = await s3CreateMultipart(s3cfg, key, contentType);
    if (s3Uid) s3UploadIds[s3cfg.bucket] = s3Uid;
  }
  if (Object.keys(s3UploadIds).length > 0 && c.env.DRIVE) {
    await c.env.DRIVE.put('_s3/' + mp.uploadId + '.json', JSON.stringify({ s3UploadIds, key, filename }));
  }

  return c.json({ uploadId: mp.uploadId, key });
});

// ── Upload part (primary + all sync backends) ──

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

  // Primary part upload (via engine - not directly supported for multipart resume,
  // so we use R2 directly if available)
  let partResult: { partNumber: number; etag: string };
  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    partResult = await r2mp.uploadPart(partNumber, chunkBuf);
  } else {
    // S3 primary - need to track the uploadId
    throw new Error('S3 primary multipart resume not yet supported without R2');
  }

  // S3 sync part upload (fire-and-forget)
  const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
  if (s3Cfgs.length > 0 && c.env.DRIVE) {
    const s3Meta = await c.env.DRIVE.get('_s3/' + uploadId + '.json');
    if (s3Meta) {
      const { s3UploadIds } = JSON.parse(await s3Meta.text());
      const { s3UploadPart } = await import('./s3-upload');
      for (const s3cfg of s3Cfgs) {
        const s3Uid = s3UploadIds?.[s3cfg.bucket];
        if (s3Uid) s3UploadPart(s3cfg, key, s3Uid, partNumber, chunkBuf).catch(() => {});
      }
    }
  }

  return c.json({ partNumber: partResult.partNumber, etag: partResult.etag });
});

// ── Complete multipart upload ──

uploadRoutes.post('/complete', async (c) => {
  const body = await c.req.json<{ uploadId: string; key: string; parts: UploadPart[] }>();
  const { uploadId, key, parts } = body;

  if (!uploadId || !key || !parts?.length) return c.json({ error: '缺少参数' }, 400);

  const engine = await createStorageEngine(c.env);
  let object: { key: string; size: number };

  // Primary complete
  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    object = await r2mp.complete(parts);
  } else {
    object = { key, size: 0 };
  }

  // S3 sync complete (fire-and-forget)
  const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
  if (s3Cfgs.length > 0 && c.env.DRIVE) {
    const s3Meta = await c.env.DRIVE.get('_s3/' + uploadId + '.json');
    if (s3Meta) {
      const { s3UploadIds } = JSON.parse(await s3Meta.text());
      const { s3CompleteMultipart } = await import('./s3-upload');
      for (const s3cfg of s3Cfgs) {
        const s3Uid = s3UploadIds?.[s3cfg.bucket];
        if (s3Uid) s3CompleteMultipart(s3cfg, key, s3Uid, parts).catch(() => {});
      }
      await c.env.DRIVE.delete('_s3/' + uploadId + '.json');
    }
  }

  const name = key.split('/').pop() || key;
  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key,
      name,
      size: object.size,
      ip: c.req.header('CF-Connecting-IP') || '',
      country: c.req.header('CF-IPCountry') || '',
      ua: c.req.header('User-Agent') || '',
      referer: c.req.header('Referer') || '',
      source: 'dashboard',
    }),
  );

  return c.json({ ok: true, key: object.key, name });
});

// ── Abort ──

uploadRoutes.post('/abort', async (c) => {
  const body = await c.req.json<{ uploadId: string; key: string }>();
  const { uploadId, key } = body;

  if (!uploadId || !key) return c.json({ error: '缺少参数' }, 400);

  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    await r2mp.abort();
    await c.env.DRIVE.delete('_s3/' + uploadId + '.json').catch(() => {});
  }

  return c.json({ ok: true });
});
