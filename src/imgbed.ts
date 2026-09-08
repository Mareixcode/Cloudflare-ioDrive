import { Hono } from 'hono';
import type { Env } from './types';
import { verifyTurnstile } from './turnstile';
import { getSafeImageContentType, uniqueKey } from './upload-utils';
import { writeUploadLog } from './upload-logs';
import { getAllS3ConfigsAsync } from './storage';
import { createStorageEngine } from './storage-engine';
import { moderateAndCleanup } from './moderation';
import { s3PutObject } from './s3-upload';
import { clearFileCache } from './cache';
import { jwtAuth } from './auth';
import { assertSafeStorageKey } from './storage-path';

export const imgbedRoutes = new Hono<{ Bindings: Env }>();

const IMGBED_PATH = 'uploads/imgbed/';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
function isImageFile(filename: string): boolean {
  return getSafeImageContentType(filename) !== null;
}

// ── 公开上传（Turnstile 验证） ──
imgbedRoutes.post('/upload', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || '';
  const body = await c.req.parseBody();
  const file = body['file'];
  const turnstile = body['turnstile'] as string;

  if (!file || !(file instanceof File)) return c.json({ error: '缺少图片文件' }, 400);
  if (!turnstile) return c.json({ error: '缺少人机验证' }, 400);
  if (!(await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET, ip))) {
    return c.json({ error: '人机验证失败' }, 403);
  }

  if (!isImageFile(file.name)) {
    return c.json({ error: '仅支持图片格式（jpg/png/gif/webp/bmp/ico）' }, 400);
  }
  if (file.size > MAX_SIZE) {
    return c.json({ error: '图片大小不能超过 10MB' }, 400);
  }

  const engine = await createStorageEngine(c.env);
  const key = await uniqueKey(engine, IMGBED_PATH, file.name);
  const contentType = getSafeImageContentType(file.name)!;
  const buf = await file.arrayBuffer();

  // 主存储上传
  await engine.put(key, buf, { contentType });

  // 同步到其他 S3 后端
  const s3Cfgs = await getAllS3ConfigsAsync(c.env);
  const syncCfgs = engine.kind === 'r2' ? s3Cfgs : s3Cfgs.slice(1);
  for (const s3cfg of syncCfgs) {
    try { await s3PutObject(s3cfg, key, buf, contentType); } catch (e) { console.error('S3 sync error:', e); }
  }

  // 异步写入上传日志
  c.executionCtx.waitUntil(
    writeUploadLog(c.env, {
      key, name: file.name, size: file.size, ip,
      country: c.req.header('CF-IPCountry') || '',
      ua: c.req.header('User-Agent') || '',
      referer: c.req.header('Referer') || '',
      source: 'public',
    }),
  );

  // 异步内容审核
  c.executionCtx.waitUntil(
    moderateAndCleanup(c.env, {
      key, name: file.name, size: file.size,
      contentType, ip,
      ua: c.req.header('User-Agent') || '',
      source: 'public',
    }),
  );

  // 清除缓存
  c.executionCtx.waitUntil(clearFileCache(c.env, '', key));

  // 构建外链 URL
  let fileUrl = '';
  if (c.env.PUBLIC_DOMAIN) {
    const encoded = key.split('/').map(encodeURIComponent).join('/');
    fileUrl = `https://${c.env.PUBLIC_DOMAIN}/${encoded}`;
  } else {
    const origin = new URL(c.req.url).origin;
    fileUrl = `${origin}/f/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  return c.json({ ok: true, url: fileUrl, key, name: file.name });
});

// ── 图片列表（管理员） ──
imgbedRoutes.get('/list', jwtAuth, async (c) => {
  try {
    const engine = await createStorageEngine(c.env);
    const listed = await engine.list(IMGBED_PATH, { limit: 1000 });

    const items = listed.objects
      .filter((obj) => {
        if (obj.key.endsWith('/') || obj.key.startsWith('_')) return false;
        return isImageFile(obj.key);
      })
      .map((obj) => {
        let url = '';
        if (c.env.PUBLIC_DOMAIN) {
          url = `https://${c.env.PUBLIC_DOMAIN}/${obj.key.split('/').map(encodeURIComponent).join('/')}`;
        } else {
          const origin = new URL(c.req.url).origin;
          url = `${origin}/f/${obj.key.split('/').map(encodeURIComponent).join('/')}`;
        }
        return {
          key: obj.key,
          name: obj.key.replace(IMGBED_PATH, ''),
          size: obj.size,
          uploaded: obj.uploaded || new Date().toISOString(),
          contentType: getSafeImageContentType(obj.key) || 'image/jpeg',
          url,
        };
      })
      .sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());

    return c.json({ ok: true, items });
  } catch (err: unknown) {
    console.error('Imgbed list error:', err);
    return c.json({ ok: false, error: '获取图床列表失败' }, 500);
  }
});

// ── 删除图片（管理员） ──
imgbedRoutes.delete('/:key{.+}', jwtAuth, async (c) => {
  const key = c.req.param('key');
  if (!key) return c.json({ error: '缺少文件路径' }, 400);
  try {
    assertSafeStorageKey(key);
  } catch {
    return c.json({ error: '文件路径无效' }, 400);
  }
  if (!key.startsWith(IMGBED_PATH)) return c.json({ error: '只能删除图床目录中的文件' }, 400);

  try {
    const engine = await createStorageEngine(c.env);
    await engine.delete(key);
    c.executionCtx.waitUntil(clearFileCache(c.env, '', key));
    return c.json({ ok: true });
  } catch (err: unknown) {
    console.error('Imgbed delete error:', err);
    return c.json({ ok: false, error: '删除失败' }, 500);
  }
});
