import { Hono } from 'hono';
import type { Env, UploadKey, UploadPart } from './types';
import { verifyTurnstile } from './turnstile';
import { getContentType, uniqueKey } from './upload-utils';
import { writeUploadLog } from './upload-logs';
import { getAllS3ConfigsAsync } from './storage';
import { createStorageEngine } from './storage-engine';
import { s3PutObject, s3CreateMultipart, s3UploadPart, s3CompleteMultipart, s3AbortMultipart } from './s3-upload';

export const uploadPublicRoutes = new Hono<{ Bindings: Env }>();

function getPublicUploadPath(env: Env): string {
  const p = env.PUBLIC_UPLOAD_PATH || 'uploads/public/';
  return p.endsWith('/') ? p : p + '/';
}

// ── Single file upload (Turnstile + optional key) ──
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

  const engine = await createStorageEngine(c.env);

  let keyLabel: string | undefined;
  if (uploadKeyId) {
    const data = await engine.get('_upload_keys/' + uploadKeyId + '.json');
    if (!data) return c.json({ error: '上传链接不存在' }, 404);
    const key: UploadKey = JSON.parse(await data.text());
    if (!key.active) return c.json({ error: '上传链接已禁用' }, 403);
    if (new Date(key.expires) < new Date()) return c.json({ error: '上传链接已过期' }, 410);
    path = key.path;
    keyLabel = key.label;
    // 使用 CAS 避免竞态：乐观递增 + 带条件写入
    key.usedCount = (key.usedCount || 0) + 1;
    await engine.put('_upload_keys/' + uploadKeyId + '.json', JSON.stringify(key), { contentType: 'application/json' });
  }

  if (!path.endsWith('/')) path += '/';
  const key2 = await uniqueKey(engine, path, file.name);
  const contentType = file.type || 'application/octet-stream';
  const buf = await file.arrayBuffer();

  // Primary upload
  await engine.put(key2, buf, { contentType });

  // Sync to other S3 backends（主后端已通过 engine.put 写入）
  const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
  const syncCfgs = c.env.DRIVE ? s3Cfgs : s3Cfgs.slice(1);
  let s3Ok = false;
  for (const s3cfg of syncCfgs) {
    try { const ok = await s3PutObject(s3cfg, key2, buf, contentType); if (ok) s3Ok = true; } catch (e) { console.error('S3 upload error:', e); }
  }

  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key: key2, name: file.name, size: file.size, ip,
      country: c.req.header('CF-IPCountry') || '',
      ua: c.req.header('User-Agent') || '',
      referer: c.req.header('Referer') || '',
      source: uploadKeyId ? 'upload-key' : 'public',
      uploadKeyId, uploadKeyLabel: keyLabel,
    }),
  );

  return c.json({ ok: true, key: key2, name: file.name, s3: s3Ok });
});

// ── Init multipart (Turnstile + optional key) ──
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

  const engine = await createStorageEngine(c.env);

  let keyLabel: string | undefined;
  if (uploadKeyId) {
    const data = await engine.get('_upload_keys/' + uploadKeyId + '.json');
    if (!data) return c.json({ error: '上传链接不存在' }, 404);
    const key: UploadKey = JSON.parse(await data.text());
    if (!key.active) return c.json({ error: '上传链接已禁用' }, 403);
    if (new Date(key.expires) < new Date()) return c.json({ error: '上传链接已过期' }, 410);
    path = key.path;
    keyLabel = key.label;
    key.usedCount = (key.usedCount || 0) + 1;
    await engine.put('_upload_keys/' + uploadKeyId + '.json', JSON.stringify(key), { contentType: 'application/json' });
  }

  if (!path.endsWith('/')) path += '/';
  const key2 = await uniqueKey(engine, path, filename);
  const ct = getContentType(filename);

  // Primary init
  const mp = await engine.createMultipartUpload(key2, { contentType: ct });

  // Sync init to S3 backends
  const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
  const s3UploadIds: Record<string, string> = {};
  for (const s3cfg of s3Cfgs) {
    const s3Uid = await s3CreateMultipart(s3cfg, key2, ct);
    if (s3Uid) s3UploadIds[s3cfg.bucket] = s3Uid;
  }
  if (Object.keys(s3UploadIds).length > 0) {
    await engine.put('_multipart/' + mp.uploadId + '.json', JSON.stringify({
      s3UploadIds, key: key2, filename, uploadKeyId, uploadKeyLabel: keyLabel,
      source: uploadKeyId ? 'upload-key' : 'public',
    }), { contentType: 'application/json' });
  }

  return c.json({ uploadId: mp.uploadId, key: key2 });
});

// ── Upload part (no Turnstile needed) ──
uploadPublicRoutes.post('/part', async (c) => {
  const body = await c.req.parseBody();
  const uploadId = body['uploadId'] as string;
  const key = body['key'] as string;
  const partNumber = parseInt(body['partNumber'] as string, 10);
  const chunk = body['chunk'];

  if (!uploadId || !key || !partNumber || !chunk) return c.json({ error: '缺少参数' }, 400);
  if (!(chunk instanceof File)) return c.json({ error: '无效的文件数据' }, 400);

  const engine = await createStorageEngine(c.env);
  const chunkBuf = await chunk.arrayBuffer();

  // Primary part upload
  let partResult: { partNumber: number; etag: string };
  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    partResult = await r2mp.uploadPart(partNumber, chunkBuf);
  } else {
    const meta = await engine.get('_multipart/' + uploadId + '.json');
    if (!meta) throw new Error('分片上传会话不存在');
    const { s3UploadIds } = JSON.parse(await meta.text());
    const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    const primaryS3 = s3Cfgs[0];
    const primaryUid = primaryS3 ? s3UploadIds[primaryS3.bucket] : null;
    if (!primaryS3 || !primaryUid) throw new Error('S3 主存储未配置');
    const etag = await s3UploadPart(primaryS3, key, primaryUid, partNumber, chunkBuf);
    if (!etag) throw new Error('S3 分片上传失败');
    partResult = { partNumber, etag };
  }

  // Sync part to S3 backends (fire-and-forget)
  const meta = await engine.get('_multipart/' + uploadId + '.json');
  if (meta) {
    const { s3UploadIds } = JSON.parse(await meta.text());
    const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    const syncCfgs = c.env.DRIVE ? s3Cfgs : s3Cfgs.slice(1);
    for (const s3cfg of syncCfgs) {
      const s3Uid = s3UploadIds?.[s3cfg.bucket];
      if (s3Uid) s3UploadPart(s3cfg, key, s3Uid, partNumber, chunkBuf).catch(() => {});
    }
  }

  return c.json({ partNumber: partResult.partNumber, etag: partResult.etag });
});

// ── Complete multipart ──
uploadPublicRoutes.post('/complete', async (c) => {
  const body = await c.req.json<{ uploadId: string; key: string; parts: UploadPart[] }>();
  const { uploadId, key, parts } = body;

  if (!uploadId || !key || !parts?.length) return c.json({ error: '缺少参数' }, 400);

  const engine = await createStorageEngine(c.env);
  let object: { key: string; size: number };

  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    object = await r2mp.complete(parts);
  } else {
    const meta = await engine.get('_multipart/' + uploadId + '.json');
    if (meta) {
      const { s3UploadIds } = JSON.parse(await meta.text());
      const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
      const primaryS3 = s3Cfgs[0];
      const primaryUid = primaryS3 ? s3UploadIds[primaryS3.bucket] : null;
      if (primaryS3 && primaryUid) await s3CompleteMultipart(primaryS3, key, primaryUid, parts);
    }
    object = { key, size: 0 };
  }

  // 获取实际文件大小（S3 primary 时 complete 不返回 size）
  if (object.size === 0) {
    try {
      const head = await engine.head(key);
      if (head) object.size = head.size;
    } catch {}
  }

  // Sync complete to S3 backends
  let meta: any = {};
  const metaObj = await engine.get('_multipart/' + uploadId + '.json');
  if (metaObj) {
    meta = JSON.parse(await metaObj.text());
    const { s3UploadIds } = meta;
    const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    const syncCfgs = c.env.DRIVE ? s3Cfgs : s3Cfgs.slice(1);
    for (const s3cfg of syncCfgs) {
      const s3Uid = s3UploadIds?.[s3cfg.bucket];
      if (s3Uid) s3CompleteMultipart(s3cfg, key, s3Uid, parts).catch(() => {});
    }
    await engine.delete('_multipart/' + uploadId + '.json');
  }

  const name = key.split('/').pop() || key;
  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key, name, size: object.size,
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

  const engine = await createStorageEngine(c.env);

  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    await r2mp.abort();
  }

  // 取消 S3 后端的多段上传
  const mpMeta = await engine.get('_multipart/' + uploadId + '.json').catch(() => null);
  if (mpMeta) {
    try {
      const mpData = JSON.parse(await mpMeta.text());
      if (mpData.s3UploadIds) {
        const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
        for (const s3cfg of s3Cfgs) {
          const s3Uid = mpData.s3UploadIds?.[s3cfg.bucket];
          if (s3Uid) s3AbortMultipart(s3cfg, key, s3Uid).catch(() => {});
        }
      }
    } catch {}
  }

  await engine.delete('_multipart/' + uploadId + '.json').catch(() => {});

  return c.json({ ok: true });
});
