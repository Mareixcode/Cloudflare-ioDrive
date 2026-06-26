import { Hono } from 'hono';
import type { Env, UploadPart } from './types';
import { jwtAuth } from './auth';
import { s3PutObject, s3CreateMultipart, s3UploadPart, s3CompleteMultipart } from './s3-upload';
import { getContentType, uniqueKey } from './upload-utils';
import { writeUploadLog } from './upload-logs';

export const uploadRoutes = new Hono<{ Bindings: Env }>();

uploadRoutes.use('*', jwtAuth);

function getS3Cfg(env: Env) {
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) return null;
  return { endpoint: env.S3_ENDPOINT, bucket: env.S3_BUCKET, region: env.S3_REGION, accessKey: env.S3_ACCESS_KEY, secretKey: env.S3_SECRET_KEY };
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

  // S3 upload (secondary)
  const s3cfg = getS3Cfg(c.env);
  let s3Ok = false;
  if (s3cfg) {
    try { s3Ok = await s3PutObject(s3cfg, key, buf, contentType); } catch (e) { console.error('S3 upload error:', e); }
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
  const s3cfg = getS3Cfg(c.env);
  let s3UploadId: string | null = null;
  if (s3cfg) {
    s3UploadId = await s3CreateMultipart(s3cfg, key, contentType);
    if (s3UploadId) {
      await c.env.DRIVE.put('_s3/' + r2mp.uploadId + '.json', JSON.stringify({ s3UploadId, key, filename }));
    }
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

  // S3 part upload (fire-and-forget)
  const s3cfg = getS3Cfg(c.env);
  if (s3cfg) {
    const s3Meta = await c.env.DRIVE.get('_s3/' + uploadId + '.json');
    if (s3Meta) {
      const { s3UploadId } = JSON.parse(await s3Meta.text());
      s3UploadPart(s3cfg, key, s3UploadId, partNumber, chunkBuf).catch(() => {});
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

  // S3 complete (fire-and-forget)
  const s3cfg = getS3Cfg(c.env);
  if (s3cfg) {
    const s3Meta = await c.env.DRIVE.get('_s3/' + uploadId + '.json');
    if (s3Meta) {
      const { s3UploadId } = JSON.parse(await s3Meta.text());
      s3CompleteMultipart(s3cfg, key, s3UploadId, parts).catch(() => {});
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
