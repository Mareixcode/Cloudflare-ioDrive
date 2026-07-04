import { Hono } from 'hono';
import type { Env, ShareRecord } from './types';
import { jwtAuth } from './auth';
import { createStorageEngine } from './storage-engine';
import { createMetadataStore } from './metadata-store';

const SHARES_PREFIX = '_shares/';

// Public routes (no auth required)
export const sharePublicRoutes = new Hono<{ Bindings: Env }>();

// Get share info (public, for share page)
sharePublicRoutes.get('/info/:token', async (c) => {
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  const token = c.req.param('token');
  const record = await meta.get<ShareRecord>(SHARES_PREFIX + token);

  if (!record) {
    return c.json({ error: '分享链接不存在或已过期' }, 404);
  }

  if (record.expires && new Date(record.expires) < new Date()) {
    return c.json({ error: '分享链接已过期' }, 410);
  }

  const fileInfo = await engine.head(record.key);

  return c.json({
    token: record.token,
    key: record.key,
    name: record.name,
    size: fileInfo?.size || 0,
    created: record.created,
    noAd: record.noAd,
    downloads: record.downloads,
  });
});

// Protected routes (JWT auth required)
export const shareRoutes = new Hono<{ Bindings: Env }>();

shareRoutes.use('*', jwtAuth);

// Create share link
shareRoutes.post('/', async (c) => {
  const meta = createMetadataStore(c.env);
  const body = await c.req.json<{ key: string; name: string; noAd?: boolean }>();
  const { key, name, noAd } = body;

  if (!key) {
    return c.json({ error: '缺少文件 key' }, 400);
  }

  const token = generateToken();

  const record: ShareRecord = {
    token,
    key,
    name: name || key.split('/').pop() || key,
    created: new Date().toISOString(),
    noAd: noAd || false,
    downloads: 0,
  };

  await meta.put(SHARES_PREFIX + token, record);

  return c.json({ token, url: '/s/' + token });
});

// List shares
shareRoutes.get('/', async (c) => {
  const meta = createMetadataStore(c.env);
  const { keys } = await meta.list(SHARES_PREFIX, { limit: 500 });
  const shares: ShareRecord[] = [];

  for (const key of keys) {
    const rec = await meta.get<ShareRecord>(key);
    if (rec) shares.push(rec);
  }

  // 按创建时间倒序
  shares.sort((a, b) => b.created.localeCompare(a.created));

  return c.json({ shares });
});

// Delete share
shareRoutes.delete('/:token', async (c) => {
  const meta = createMetadataStore(c.env);
  const token = c.req.param('token');
  await meta.delete(SHARES_PREFIX + token);
  return c.json({ ok: true });
});

// Batch share
shareRoutes.post('/batch', async (c) => {
  const meta = createMetadataStore(c.env);
  const { keys } = await c.req.json<{ keys: string[] }>();
  if (!keys?.length) return c.json({ error: 'no keys' }, 400);

  const shares: { token: string; name: string }[] = [];
  for (const key of keys) {
    if (key.endsWith('/')) continue;
    const token = generateToken();
    const name = key.split('/').pop() || key;
    const record: ShareRecord = { token, key, name, created: new Date().toISOString(), noAd: false, downloads: 0 };
    await meta.put(SHARES_PREFIX + token, record);
    shares.push({ token, name });
  }

  return c.json({ shares, count: shares.length });
});

/**
 * 原子地递增分享下载计数。需要先读到最新记录，然后用 read-modify-write。
 * 多数场景下并发量低，简单实现即可。
 */
export async function incrementShareDownload(meta: ReturnType<typeof createMetadataStore>, token: string): Promise<ShareRecord | null> {
  const record = await meta.get<ShareRecord>(SHARES_PREFIX + token);
  if (!record) return null;
  record.downloads = (record.downloads || 0) + 1;
  await meta.put(SHARES_PREFIX + token, record);
  return record;
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  // 使用拒绝采样避免模数偏差：256 - (256 % 62) = 248，值 >= 248 时重新采样
  const arr = new Uint8Array(16);
  let idx = 0;
  crypto.getRandomValues(arr);
  for (let i = 0; i < 12; i++) {
    while (idx < arr.length && arr[idx] >= 248) idx++;
    if (idx >= arr.length) { crypto.getRandomValues(arr); idx = 0; }
    result += chars[arr[idx] % chars.length];
    idx++;
  }
  return result;
}
