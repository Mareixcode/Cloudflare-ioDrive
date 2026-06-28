import { Hono } from 'hono';
import type { Env, UploadPart } from './types';
import { jwtAuth } from './auth';
import { getContentType, uniqueKey } from './upload-utils';
import { writeUploadLog } from './upload-logs';
import { getAllS3ConfigsAsync } from './storage';
import { createStorageEngine } from './storage-engine';
import { s3PutObject, s3CreateMultipart, s3UploadPart, s3CompleteMultipart, s3AbortMultipart } from './s3-upload';

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
  const key = await uniqueKey(engine, path, file.name);
  const contentType = file.type || 'application/octet-stream';
  const buf = await file.arrayBuffer();

  // Primary upload
  await engine.put(key, buf, { contentType });

  // Sync to other S3 backends（主后端已通过 engine.put 写入）
  const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
  const syncCfgs = c.env.DRIVE ? s3Cfgs : s3Cfgs.slice(1);
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

  return c.json({ ok: true, key, name: file.name, s3: s3Ok });
});

// ── Init multipart upload ──

uploadRoutes.post('/init', async (c) => {
  const body = await c.req.json<{ filename: string; size: number; path?: string }>();
  const { filename } = body;
  const path = body.path || 'uploads/';

  if (!filename) return c.json({ error: '缺少文件名' }, 400);

  const engine = await createStorageEngine(c.env);
  const key = await uniqueKey(engine, path, filename);
  const contentType = getContentType(filename);

  // Primary init (R2 or S3 via engine)
  const mp = await engine.createMultipartUpload(key, { contentType });

  // Sync init to all S3 backends
  const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
  const s3UploadIds: Record<string, string> = {};
  for (const s3cfg of s3Cfgs) {
    const s3Uid = await s3CreateMultipart(s3cfg, key, contentType);
    if (s3Uid) s3UploadIds[s3cfg.bucket] = s3Uid;
  }

  // Store multipart metadata in primary storage
  if (Object.keys(s3UploadIds).length > 0) {
    await engine.put('_multipart/' + mp.uploadId + '.json', JSON.stringify({ s3UploadIds, key, filename }), { contentType: 'application/json' });
  }

  return c.json({ uploadId: mp.uploadId, key });
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

  // Primary part upload (R2 resumeMultipartUpload if available)
  let partResult: { partNumber: number; etag: string };
  // 读取多段上传元数据（一次读取，后续复用）
  const mpMeta = await engine.get('_multipart/' + uploadId + '.json');
  const mpData = mpMeta ? JSON.parse(await mpMeta.text()) : null;

  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    partResult = await r2mp.uploadPart(partNumber, chunkBuf);
  } else {
    // S3 primary: need to find the uploadId from metadata
    if (!mpData) return c.json({ error: '分片上传会话不存在' }, 404);
    const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    const primaryS3 = s3Cfgs[0];
    const primaryUid = primaryS3 ? mpData.s3UploadIds?.[primaryS3.bucket] : null;
    if (!primaryS3 || !primaryUid) return c.json({ error: 'S3 主存储未配置' }, 500);
    const etag = await s3UploadPart(primaryS3, key, primaryUid, partNumber, chunkBuf);
    if (!etag) return c.json({ error: 'S3 分片上传失败' }, 500);
    partResult = { partNumber, etag };
  }

  // Sync part to other S3 backends（fire-and-forget，失败时记录日志）
  if (mpData && mpData.s3UploadIds) {
    const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    const syncCfgs = c.env.DRIVE ? s3Cfgs : s3Cfgs.slice(1);
    for (const s3cfg of syncCfgs) {
      const s3Uid = mpData.s3UploadIds?.[s3cfg.bucket];
      if (s3Uid) s3UploadPart(s3cfg, key, s3Uid, partNumber, chunkBuf).catch(e => {
        console.error(`S3 sync part failed (bucket=${s3cfg.bucket}, part=${partNumber}):`, e);
      });
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

  // 读取多段上传元数据（一次读取，后续复用）
  const mpMeta = await engine.get('_multipart/' + uploadId + '.json');
  const mpData = mpMeta ? JSON.parse(await mpMeta.text()) : null;

  // Primary complete
  if (c.env.DRIVE) {
    const r2mp = c.env.DRIVE.resumeMultipartUpload(key, uploadId);
    object = await r2mp.complete(parts);
  } else {
    // S3 primary complete
    if (mpData) {
      const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
      const primaryS3 = s3Cfgs[0];
      const primaryUid = primaryS3 ? mpData.s3UploadIds?.[primaryS3.bucket] : null;
      if (primaryS3 && primaryUid) {
        await s3CompleteMultipart(primaryS3, key, primaryUid, parts);
      }
    }
    object = { key, size: 0 };
  }

  // S3 complete 后获取实际文件大小
  if (object.size === 0) {
    try {
      const head = await engine.head(key);
      if (head) object.size = head.size;
    } catch {}
  }

  // Sync complete to other S3 backends（fire-and-forget，失败时记录日志）
  if (mpData && mpData.s3UploadIds) {
    const s3Cfgs = await getAllS3ConfigsAsync(c.env, c.env.DRIVE);
    const syncCfgs = c.env.DRIVE ? s3Cfgs : s3Cfgs.slice(1);
    for (const s3cfg of syncCfgs) {
      const s3Uid = mpData.s3UploadIds?.[s3cfg.bucket];
      if (s3Uid) s3CompleteMultipart(s3cfg, key, s3Uid, parts).catch(e => {
        console.error(`S3 sync complete failed (bucket=${s3cfg.bucket}):`, e);
      });
    }
    await engine.delete('_multipart/' + uploadId + '.json').catch(() => {});
  }

  const name = key.split('/').pop() || key;
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

  return c.json({ ok: true, key: object.key, name });
});

// ── Abort ──

uploadRoutes.post('/abort', async (c) => {
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
