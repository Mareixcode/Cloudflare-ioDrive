import { Hono } from 'hono';
import type { Env } from './types';
import { getContentType, uniqueKey } from './upload-utils';
import { writeUploadLog } from './upload-logs';
import { getAllS3ConfigsAsync } from './storage';
import { createStorageEngine } from './storage-engine';
import { createMetadataStore } from './metadata-store';
import { getUploadKeyRecord, incrementUploadKeyUsage } from './upload-keys';
import { moderateAndCleanup } from './moderation';
import { s3PutObject } from './s3-upload';
import { clearFileCache } from './cache';
import { normalizeUploadDirectory } from './storage-path';

export const picgoRoutes = new Hono<{ Bindings: Env }>();
const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

picgoRoutes.post('/', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || '';
  const authHeader = c.req.header('Authorization');
  let uploadKeyId = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    uploadKeyId = authHeader.slice(7).trim();
  }

  // PicGo uses multipart/form-data. The field name is typically configurable,
  // we can just extract the first File object we find.
  const body = await c.req.parseBody();
  let file: File | undefined;
  
  for (const key in body) {
    if (body[key] instanceof File) {
      file = body[key] as File;
      break;
    }
  }

  if (!file) {
    return c.json({ success: false, message: '未找到上传的文件' }, 400);
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return c.json({ success: false, message: '文件不能超过 20MB' }, 413);
  }
  
  if (!uploadKeyId) {
    return c.json({ success: false, message: '未提供 Authorization: Bearer <UploadKey>' }, 401);
  }

  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);

  let path = 'uploads/';
  let keyLabel: string | undefined;

  const keyData = await getUploadKeyRecord(meta, uploadKeyId);
  if (!keyData) return c.json({ success: false, message: '上传密钥(Upload Key)不存在' }, 404);
  if (!keyData.active) return c.json({ success: false, message: '上传密钥已禁用' }, 403);
  if (new Date(keyData.expires) < new Date()) return c.json({ success: false, message: '上传密钥已过期' }, 410);
  
  try {
    path = normalizeUploadDirectory(keyData.path);
  } catch {
    return c.json({ success: false, message: '上传密钥路径无效' }, 500);
  }
  keyLabel = keyData.label;

  const key2 = await uniqueKey(engine, path, file.name);
  const contentType = file.type || getContentType(file.name) || 'application/octet-stream';
  const buf = await file.arrayBuffer();

  // Primary upload
  await engine.put(key2, buf, { contentType });

  // Sync to other S3 backends
  const s3Cfgs = await getAllS3ConfigsAsync(c.env);
  const syncCfgs = engine.kind === 'r2' ? s3Cfgs : s3Cfgs.slice(1);
  let s3Ok = false;
  for (const s3cfg of syncCfgs) {
    try { 
      const ok = await s3PutObject(s3cfg, key2, buf, contentType); 
      if (ok) s3Ok = true; 
    } catch (e) { 
      console.error('S3 upload error:', e); 
    }
  }

  await incrementUploadKeyUsage(meta, uploadKeyId);

  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key: key2, name: file.name, size: file.size, ip,
      country: c.req.header('CF-IPCountry') || '',
      ua: c.req.header('User-Agent') || '',
      referer: c.req.header('Referer') || '',
      source: 'picgo',
      uploadKeyId, uploadKeyLabel: keyLabel,
    }),
  );

  c.executionCtx.waitUntil(
    moderateAndCleanup(c.env, {
      key: key2, name: file.name, size: file.size,
      contentType,
      ip,
      ua: c.req.header('User-Agent') || '',
      source: 'picgo',
    }),
  );

  c.executionCtx.waitUntil(clearFileCache(c.env, '', key2));

  let fileUrl = '';
  if (c.env.PUBLIC_DOMAIN) {
    const encoded = key2.split('/').map(encodeURIComponent).join('/');
    fileUrl = `https://${c.env.PUBLIC_DOMAIN}/${encoded}`;
  } else {
    // Fallback: ioDrive's public stream route if they haven't configured a public domain but are using the app
    const origin = new URL(c.req.url).origin;
    fileUrl = `${origin}/f/${key2.split('/').map(encodeURIComponent).join('/')}`;
  }

  return c.json({ 
    success: true, 
    url: fileUrl,
    key: key2, 
    name: file.name, 
    s3: s3Ok 
  });
});
