import { Hono } from 'hono';
import type { Env, UploadKey, UploadPart } from './types';
import { verifyTurnstile } from './turnstile';
import { s3PutObject, s3CreateMultipart, s3UploadPart, s3CompleteMultipart } from './s3-upload';
import { getContentType, uniqueKey } from './upload-utils';
import { writeUploadLog } from './upload-logs';
import { getAllS3ConfigsAsync } from './storage';

export const uploadPublicRoutes = new Hono<{ Bindings: Env }>();

async function getS3Cfgs(env: Env, drive: R2Bucket) {
  return getAllS3ConfigsAsync(env, drive);
}

function getPublicUploadPath(env: Env): string {
  const p = env.PUBLIC_UPLOAD_PATH || 'uploads/public/';
  return p.endsWith('/') ? p : p + '/';
}

// Validate turnstile + optional upload key; returns { path, error? }
async function validateUpload(c: any): Promise<{ path: string; error?: string; status?: number }> {
  const ip = c.req.header('CF-Connecting-IP') || '';

  // For single: parse body to get turnstile + key
  // For init: parse json to get turnstile + key
  let turnstile: string | undefined;
  let uploadKeyId: string | undefined;
  let path: string = getPublicUploadPath(c.env);

  const contentType = c.req.header('Content-Type') || '';
  if (contentType.includes('multipart/form-data')) {
    const body = await c.req.parseBody();
    turnstile = body['turnstile'] as string;
    uploadKeyId = body['uploadKeyId'] as string;
    path = (body['path'] as string) || getPublicUploadPath(c.env);
  } else {
    const body = await c.req.json() as { turnstile?: string; uploadKeyId?: string; path?: string };
    turnstile = body.turnstile;
    uploadKeyId = body.uploadKeyId;
    path = body.path || getPublicUploadPath(c.env);
  }

  if (!turnstile) return { path, error: '缺少人机验证', status: 400 };
  if (!(await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET, ip))) {
    return { path, error: '人机验证失败', status: 403 };
  }

  if (uploadKeyId) {
    const data = await c.env.DRIVE.get('_upload_keys/' + uploadKeyId + '.json');
    if (!data) return { path, error: '上传链接不存在', status: 404 };
    const key: UploadKey = JSON.parse(await data.text());
    if (!key.active) return { path, error: '上传链接已禁用', status: 403 };
    if (new Date(key.expires) < new Date()) return { path, error: '上传链接已过期', status: 410 };
    path = key.path;
    // Increment used count
    key.usedCount++;
    await c.env.DRIVE.put('_upload_keys/' + uploadKeyId + '.json', JSON.stringify(key), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  if (!path.endsWith('/')) path += '/';
  return { path };
}

// ── Single file upload (Turnstile + optional key, R2 + S3) ──
uploadPublicRoutes.post('/single', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || '';
  const body = await c.req.parseBody();
  const file = body['file'];
  const turnstile = body['turnstile'] as string;
  const uploadKeyId = body['uploadKeyId'] as string;
  let path = (body['path'] as string) || getPublicUploadPath(c.env);

  if (!file || !(file instanceof File)) return c.json({ error: '缺少文件' }, 400);
  if (!turnstile) return c.json({ error: '缺少人机验证' }, 400);
  if (!(await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET, ip))) {
    return c.json({ error: '人机验证失败' }, 403);
  }

  // Validate upload key
  let keyLabel: string | undefined;
  if (uploadKeyId) {
    const data = await c.env.DRIVE.get('_upload_keys/' + uploadKeyId + '.json');
    if (!data) return c.json({ error: '上传链接不存在' }, 404);
    const key: UploadKey = JSON.parse(await data.text());
    if (!key.active) return c.json({ error: '上传链接已禁用' }, 403);
    if (new Date(key.expires) < new Date()) return c.json({ error: '上传链接已过期' }, 410);
    path = key.path;
    keyLabel = key.label;
    key.usedCount++;
    await c.env.DRIVE.put('_upload_keys/' + uploadKeyId + '.json', JSON.stringify(key), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  if (!path.endsWith('/')) path += '/';
  const key2 = await uniqueKey(c.env.DRIVE, path, file.name);
  const contentType = file.type || 'application/octet-stream';
  const buf = await file.arrayBuffer();

  // R2 upload
  await c.env.DRIVE.put(key2, buf, {
    httpMetadata: { contentType },
    customMetadata: { originalName: file.name, uploadedAt: new Date().toISOString() },
  });

  // S3 upload (all backends)
  const s3Cfgs = await getS3Cfgs(c.env, c.env.DRIVE);
  let s3Ok = false;
  for (const s3cfg of s3Cfgs) {
    try { const ok = await s3PutObject(s3cfg, key2, buf, contentType); if (ok) s3Ok = true; } catch (e) { console.error('S3 upload error:', e); }
  }

  // Log upload
  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key: key2,
      name: file.name,
      size: file.size,
      ip,
      country: c.req.header('CF-IPCountry') || '',
      ua: c.req.header('User-Agent') || '',
      referer: c.req.header('Referer') || '',
      source: uploadKeyId ? 'upload-key' : 'public',
      uploadKeyId,
      uploadKeyLabel: keyLabel,
    }),
  );

  return c.json({ ok: true, key: key2, name: file.name, s3: s3Ok });
});

// ── Init multipart (Turnstile + optional key, R2 + S3) ──
uploadPublicRoutes.post('/init', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || '';
  const body = await c.req.json<{ filename: string; size: number; path?: string; turnstile?: string; uploadKeyId?: string }>();
  const { filename, turnstile, uploadKeyId } = body;
  let path = body.path || getPublicUploadPath(c.env);

  if (!filename) return c.json({ error: '缺少文件名' }, 400);
  if (!turnstile) return c.json({ error: '缺少人机验证' }, 400);
  if (!(await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET, ip))) {
    return c.json({ error: '人机验证失败' }, 403);
  }

  let keyLabel: string | undefined;
  if (uploadKeyId) {
    const data = await c.env.DRIVE.get('_upload_keys/' + uploadKeyId + '.json');
    if (!data) return c.json({ error: '上传链接不存在' }, 404);
    const key: UploadKey = JSON.parse(await data.text());
    if (!key.active) return c.json({ error: '上传链接已禁用' }, 403);
    if (new Date(key.expires) < new Date()) return c.json({ error: '上传链接已过期' }, 410);
    path = key.path;
    keyLabel = key.label;
    key.usedCount++;
    await c.env.DRIVE.put('_upload_keys/' + uploadKeyId + '.json', JSON.stringify(key), {
      httpMetadata: { contentType: 'application/json' },
    });
  }

  if (!path.endsWith('/')) path += '/';
  const key2 = await uniqueKey(c.env.DRIVE, path, filename);
  const ct = getContentType(filename);

  // R2 init
  const r2mp = await c.env.DRIVE.createMultipartUpload(key2, { httpMetadata: { contentType: ct } });

  // S3 init (all backends)
  const s3Cfgs = await getS3Cfgs(c.env, c.env.DRIVE);
  const s3UploadIds: Record<string, string> = {};
  for (const s3cfg of s3Cfgs) {
    const s3Uid = await s3CreateMultipart(s3cfg, key2, ct);
    if (s3Uid) s3UploadIds[s3cfg.bucket] = s3Uid;
  }
  if (Object.keys(s3UploadIds).length > 0) {
    await c.env.DRIVE.put('_s3/' + r2mp.uploadId + '.json', JSON.stringify({
      s3UploadIds,
      key: key2,
      filename,
      uploadKeyId,
      uploadKeyLabel: keyLabel,
      source: uploadKeyId ? 'upload-key' : 'public',
    }));
  }

  return c.json({ uploadId: r2mp.uploadId, key: key2 });
});

// ── Upload part (R2 + S3, no Turnstile needed) ──
uploadPublicRoutes.post('/part', async (c) => {
  const body = await c.req.parseBody();
  const uploadId = body['uploadId'] as string;
  const key = body['key'] as string;
  const partNumber = parseInt(body['partNumber'] as string, 10);
  const chunk = body['chunk'];

  if (!uploadId || !key || !partNumber || !chunk) return c.json({ error: '缺少参数' }, 400);
  if (!(chunk instanceof File)) return c.json({ error: '无效的文件数据' }, 400);

  const chunkBuf = await chunk.arrayBuffer();

  // R2 part
  const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
  const uploaded = await r2mp.uploadPart(partNumber, chunkBuf);

  // S3 part (fire-and-forget, all backends)
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

// ── Complete multipart (R2 + S3) ──
uploadPublicRoutes.post('/complete', async (c) => {
  const body = await c.req.json<{ uploadId: string; key: string; parts: UploadPart[] }>();
  const { uploadId, key, parts } = body;

  if (!uploadId || !key || !parts?.length) return c.json({ error: '缺少参数' }, 400);

  const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
  const object = await r2mp.complete(parts);

  // S3 complete (fire-and-forget, all backends)
  let meta: any = {};
  const s3Cfgs = await getS3Cfgs(c.env, c.env.DRIVE);
  if (s3Cfgs.length > 0) {
    const s3Meta = await c.env.DRIVE.get('_s3/' + uploadId + '.json');
    if (s3Meta) {
      meta = JSON.parse(await s3Meta.text());
      const { s3UploadIds } = meta;
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
      source: meta.source || 'public',
      uploadKeyId: meta.uploadKeyId,
      uploadKeyLabel: meta.uploadKeyLabel,
    }),
  );

  return c.json({ ok: true, key: object.key, name });
});

// ── Abort ──
uploadPublicRoutes.post('/abort', async (c) => {
  const body = await c.req.json<{ uploadId: string; key: string }>();
  const { uploadId, key } = body;

  if (!uploadId || !key) return c.json({ error: '缺少参数' }, 400);

  const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
  await r2mp.abort();
  await c.env.DRIVE.delete('_s3/' + uploadId + '.json').catch(() => {});

  return c.json({ ok: true });
});
