import { Hono } from 'hono';
import type { Env, UploadPart } from './types';
import { jwtAuth } from './auth';
import { s3PutObject, s3CreateMultipart, s3UploadPart, s3CompleteMultipart } from './s3-upload';
import { getContentType, uniqueKey } from './upload-utils';
import { writeUploadLog } from './upload-logs';
import { getAllS3ConfigsAsync } from './storage';

export const uploadRoutes = new Hono<{ Bindings: Env }>();

uploadRoutes.use('*', jwtAuth);

// 获取所有 S3 后端配置（支持控制台运行时配置）
async function getS3Cfgs(env: Env, drive: R2Bucket) {
  return getAllS3ConfigsAsync(env, drive);
}

// ── Single file upload (R2 + S3 dual write) ──

uploadRoutes.post('/single', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  const path = (body['path'] as string) || 'uploads/';

  if (!file || !(file instanceof File)) {
    return c.json({ error: '缺少文件' }, 400);
  }

  const key = await uniqueKey(c.env.DRIVE, path, file.name);
  const contentType = file.type || 'application/octet-stream';

  // Read file once as ArrayBuffer
  const buf = await file.arrayBuffer();

  // R2 upload (primary)
  await c.env.DRIVE.put(key, buf, {
    httpMetadata: { contentType },
    customMetadata: { originalName: file.name, uploadedAt: new Date().toISOString() },
  });

  // S3 upload (all configured backends)
  const s3Cfgs = await getS3Cfgs(c.env, c.env.DRIVE);
  let s3Ok = false;
  for (const s3cfg of s3Cfgs) {
    try { const ok = await s3PutObject(s3cfg, key, buf, contentType); if (ok) s3Ok = true; } catch (e) { console.error('S3 upload error:', e); }
  }

  // Log upload
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

// ── Init multipart upload (R2 + S3) ──

uploadRoutes.post('/init', async (c) => {
  const body = await c.req.json<{ filename: string; size: number; path?: string }>();
  const { filename } = body;
  const path = body.path || 'uploads/';

  if (!filename) return c.json({ error: '缺少文件名' }, 400);

  const key = await uniqueKey(c.env.DRIVE, path, filename);
  const contentType = getContentType(filename);

  // R2 init
  const r2mp = await c.env.DRIVE.createMultipartUpload(key, { httpMetadata: { contentType } });

  // S3 init (store mapping in R2)
  const s3Cfgs = await getS3Cfgs(c.env, c.env.DRIVE);
  const s3UploadIds: Record<string, string> = {};
  for (const s3cfg of s3Cfgs) {
    const s3Uid = await s3CreateMultipart(s3cfg, key, contentType);
    if (s3Uid) s3UploadIds[s3cfg.bucket] = s3Uid;
  }
  if (Object.keys(s3UploadIds).length > 0) {
    await c.env.DRIVE.put('_s3/' + r2mp.uploadId + '.json', JSON.stringify({ s3UploadIds, key, filename }));
  }

  return c.json({ uploadId: r2mp.uploadId, key });
});

// ── Upload part (R2 + S3) ──

uploadRoutes.post('/part', async (c) => {
  const body = await c.req.parseBody();
  const uploadId = body['uploadId'] as string;
  const key = body['key'] as string;
  const partNumber = parseInt(body['partNumber'] as string, 10);
  const chunk = body['chunk'];

  if (!uploadId || !key || !partNumber || !chunk) return c.json({ error: '缺少参数' }, 400);
  if (!(chunk instanceof File)) return c.json({ error: '无效的文件数据' }, 400);

  // Read chunk once
  const chunkBuf = await chunk.arrayBuffer();

  // R2 part upload
  const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
  const uploaded = await r2mp.uploadPart(partNumber, chunkBuf);

  // S3 part upload (fire-and-forget, all backends)
  const s3Cfgs = await getS3Cfgs(c.env, c.env.DRIVE);
  if (s3Cfgs.length > 0) {
    const s3Meta = await c.env.DRIVE.get('_s3/' + uploadId + '.json');
    if (s3Meta) {
      const { s3UploadIds } = JSON.parse(await s3Meta.text());
      for (const s3cfg of s3Cfgs) {
        const s3Uid = s3UploadIds?.[s3cfg.bucket];
        if (s3Uid) s3UploadPart(s3cfg, key, s3Uid, partNumber, chunkBuf).catch(() => {});
      }
    }
  }

  return c.json({ partNumber: uploaded.partNumber, etag: uploaded.etag });
});

// ── Complete multipart upload (R2 + S3) ──

uploadRoutes.post('/complete', async (c) => {
  const body = await c.req.json<{ uploadId: string; key: string; parts: UploadPart[] }>();
  const { uploadId, key, parts } = body;

  if (!uploadId || !key || !parts?.length) return c.json({ error: '缺少参数' }, 400);

  // R2 complete
  const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
  const object = await r2mp.complete(parts);

  // S3 complete (fire-and-forget, all backends)
  const s3Cfgs = await getS3Cfgs(c.env, c.env.DRIVE);
  if (s3Cfgs.length > 0) {
    const s3Meta = await c.env.DRIVE.get('_s3/' + uploadId + '.json');
    if (s3Meta) {
      const { s3UploadIds } = JSON.parse(await s3Meta.text());
      for (const s3cfg of s3Cfgs) {
        const s3Uid = s3UploadIds?.[s3cfg.bucket];
        if (s3Uid) s3CompleteMultipart(s3cfg, key, s3Uid, parts).catch(() => {});
      }
      await c.env.DRIVE.delete('_s3/' + uploadId + '.json');
    }
  }

  // Log upload
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

  const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
  await r2mp.abort();

  await c.env.DRIVE.delete('_s3/' + uploadId + '.json').catch(() => {});

  return c.json({ ok: true });
});
