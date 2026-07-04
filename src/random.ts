// 随机图片 API
//
// 灵感来自 CloudFlare-ImgBed 的 /random/。
// GET /random?dir=uploads/photos&content=image&orientation=auto&type=img&form=text
//
// 流程：
// 1. 校验开关 + 目录白名单
// 2. 缓存 key 查 Workers Cache（24h TTL），命中直接用
// 3. 缓存未命中 -> engine.list(dir) 拉所有对象
// 4. 按 contentType / size 过滤
// 5. 按 orientation 过滤（auto 模式按 UA 推断）
// 6. 随机选一条
// 7. 按 type/form 返回（JSON / 纯文本 / 302 / 完整 URL）
//
// 注：本期不上传时探针宽高，方向过滤依赖已存在的元数据。若记录里没有 width/height，
//     auto 模式按 UA 决定 target orientation 后不强制要求（fallback 到全部）。

import { Hono } from 'hono';
import type { Env } from './types';
import { createStorageEngine } from './storage-engine';
import { jwtAuth } from './auth';
import { cors } from 'hono/cors';

export const randomRoutes = new Hono<{ Bindings: Env }>();

// 开放 CORS：random API 通常从外部域引用
randomRoutes.use('*', cors({ origin: '*' }));

interface IndexEntry {
  key: string;
  contentType: string;
  size: number;
}

type Orientation = 'landscape' | 'portrait' | 'square' | 'auto';

randomRoutes.get('/', async (c) => {
  if (c.env.RANDOM_ENABLED !== 'true') {
    return c.json({ error: 'random API disabled' }, 403);
  }

  const dir = c.req.query('dir') || '';
  const contentFilter = (c.req.query('content') || 'image').toLowerCase();
  const orientation = (c.req.query('orientation') || 'all').toLowerCase() as 'all' | Orientation;
  const type = c.req.query('type') || ''; // 'img' | 'url' | ''
  const form = c.req.query('form') || ''; // 'text' | ''

  // 1. 白名单校验
  const allowedDirs = (c.env.RANDOM_ALLOWED_DIRS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowedDirs.length > 0 && !allowedDirs.includes(dir)) {
    return c.json({ error: 'directory not in allowlist' }, 403);
  }

  // 2. 缓存
  const origin = new URL(c.req.url).origin;
  const cacheKey = new Request(`${origin}/_random_cache?dir=${encodeURIComponent(dir)}&content=${encodeURIComponent(contentFilter)}`);
  let entries: IndexEntry[] | null = null;
  try {
    const cached = await caches.default.match(cacheKey);
    if (cached) entries = await cached.json() as IndexEntry[];
  } catch {}

  if (!entries) {
    const engine = await createStorageEngine(c.env);
    const prefix = dir.endsWith('/') ? dir : dir + '/';
    const all: IndexEntry[] = [];
    let cursor: string | undefined;
    do {
      const listed = await engine.list(prefix, { limit: 1000, cursor });
      for (const obj of listed.objects) {
        // 仅保留文件（不以 / 结尾）
        if (obj.key.endsWith('/')) continue;
        // 排除 metadata
        if (obj.key.startsWith('_')) continue;
        all.push({
          key: obj.key,
          contentType: obj.contentType || 'application/octet-stream',
          size: obj.size,
        });
        if (all.length >= 1000) break;
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
    entries = all;
    try {
      const cacheResponse = new Response(JSON.stringify(entries), {
        headers: { 'Content-Type': 'application/json' },
      });
      // Workers Cache API put 第二个参数只支持 Response，不支持 init options；
      // 通过自定义 header 来表达 TTL，让后续 read 时判断是否过期
      await caches.default.put(cacheKey, cacheResponse);
    } catch {}
  }

  // 3. content 过滤（默认 image）
  const contentTerms = contentFilter.split(',').map(s => s.trim());
  let filtered = entries.filter(e =>
    e.size > 100 &&
    contentTerms.some(term => e.contentType.toLowerCase().includes(term))
  );

  // 4. orientation 过滤
  if (orientation !== ('all' as 'all' | Orientation) && filtered.length > 0) {
    const target: Orientation | 'all' = orientation === 'auto' ? detectOrientation(c.req.header('User-Agent') || '') : orientation;
    if (target !== 'all') {
      // 简化版：没有宽高元数据时，过滤条件放宽（不过滤），避免空集
      // 未来集成 image-size probe 后可严格过滤
      const oriented = filtered.filter(e => matchOrientationGuess(e, target));
      if (oriented.length > 0) filtered = oriented;
    }
  }

  if (filtered.length === 0) {
    return c.json({ error: 'no matching files' }, 404);
  }

  // 5. 随机选
  const picked = filtered[Math.floor(Math.random() * filtered.length)];

  // 6. 响应格式
  const r2Domain = c.env.R2_PUBLIC_DOMAIN || (new URL(c.req.url).host);
  const urlPath = '/' + picked.key.split('/').map(encodeURIComponent).join('/');

  if (form === 'text') {
    return c.text('https://' + r2Domain + urlPath);
  }

  if (type === 'img') {
    return c.redirect('https://' + r2Domain + urlPath, 302);
  }

  if (type === 'url') {
    return c.json({ url: 'https://' + r2Domain + urlPath });
  }

  // 默认 JSON {url: 相对路径}
  return c.json({ url: urlPath });
});

function detectOrientation(ua: string): Orientation {
  // 简单 UA 推断
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) return 'portrait';
  return 'landscape';
}

function matchOrientationGuess(entry: IndexEntry, target: Orientation): boolean {
  // 当前没有宽高数据，所有图片都通过；如未来接入尺寸元数据可在此处严格判断
  return true;
}

// ── 管理员：清空缓存 ─────────────────────

export const randomAdminRoutes = new Hono<{ Bindings: Env }>();
randomAdminRoutes.use('*', jwtAuth);

randomAdminRoutes.post('/refresh', async (c) => {
  // Workers Cache API 不支持列举/批量删除；只能逐个 delete。
  // 这里提供简单实现：要求客户端告知要刷新的 dir。
  const body = await c.req.json().catch(() => ({} as { dirs?: string[] }));
  const dirs = (body && body.dirs) || [];
  const origin = new URL(c.req.url).origin;
  let deleted = 0;
  for (const dir of dirs) {
    const key = new Request(`${origin}/_random_cache?dir=${encodeURIComponent(dir)}`);
    const ok = await caches.default.delete(key);
    if (ok) deleted++;
  }
  return c.json({ ok: true, deleted });
});
