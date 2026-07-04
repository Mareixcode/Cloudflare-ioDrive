import { Hono } from 'hono';
import type { Env, UploadKey } from './types';
import { jwtAuth } from './auth';
import { createMetadataStore } from './metadata-store';

const UPLOAD_KEYS_PREFIX = '_upload_keys/';

// ── Admin routes (JWT) ──
export const uploadKeyRoutes = new Hono<{ Bindings: Env }>();
uploadKeyRoutes.use('*', jwtAuth);

// Create upload key
uploadKeyRoutes.post('/', async (c) => {
  const meta = createMetadataStore(c.env);
  const body = await c.req.json<{ label: string; path: string; expiresHours: number }>();
  const { label, expiresHours } = body;
  let path = body.path || 'uploads/';
  if (!path.endsWith('/')) path += '/';

  if (!label) return c.json({ error: '缺少标签' }, 400);
  if (!expiresHours || expiresHours <= 0) return c.json({ error: '有效期无效' }, 400);

  const id = generateId();
  const now = new Date();
  const expires = new Date(now.getTime() + expiresHours * 3600 * 1000);

  const key: UploadKey = {
    id,
    label,
    path,
    created: now.toISOString(),
    expires: expires.toISOString(),
    usedCount: 0,
    active: true,
  };

  await meta.put(UPLOAD_KEYS_PREFIX + id, key);

  return c.json({ id, url: '/u/' + id, expires: key.expires });
});

// List upload keys
uploadKeyRoutes.get('/', async (c) => {
  const meta = createMetadataStore(c.env);
  const { keys } = await meta.list(UPLOAD_KEYS_PREFIX, { limit: 500 });
  const out: UploadKey[] = [];
  for (const k of keys) {
    try {
      const item = await meta.get<UploadKey>(k);
      if (item) out.push(item);
    } catch {}
  }
  out.sort((a, b) => (a.created > b.created ? -1 : 1));
  return c.json({ keys: out });
});

// Delete upload key
uploadKeyRoutes.delete('/:id', async (c) => {
  const meta = createMetadataStore(c.env);
  const id = c.req.param('id');
  await meta.delete(UPLOAD_KEYS_PREFIX + id);
  return c.json({ ok: true });
});

// ── Public route (no auth) ──
export const uploadKeyPublicRoutes = new Hono<{ Bindings: Env }>();

// Validate upload key
uploadKeyPublicRoutes.get('/validate/:id', async (c) => {
  const meta = createMetadataStore(c.env);
  const id = c.req.param('id');
  const key = await meta.get<UploadKey>(UPLOAD_KEYS_PREFIX + id);
  if (!key) return c.json({ valid: false, error: '链接不存在' });

  if (!key.active) return c.json({ valid: false, error: '链接已禁用' });
  if (new Date(key.expires) < new Date()) return c.json({ valid: false, error: '链接已过期', expired: true });

  return c.json({ valid: true, label: key.label, path: key.path });
});

/**
 * 原子递增 usedCount
 */
export async function incrementUploadKeyUsage(meta: ReturnType<typeof createMetadataStore>, id: string): Promise<UploadKey | null> {
  const key = await meta.get<UploadKey>(UPLOAD_KEYS_PREFIX + id);
  if (!key) return null;
  key.usedCount = (key.usedCount || 0) + 1;
  await meta.put(UPLOAD_KEYS_PREFIX + id, key);
  return key;
}

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(16);
  let result = '', idx = 0;
  crypto.getRandomValues(arr);
  for (let i = 0; i < 12; i++) {
    while (idx < arr.length && arr[idx] >= 248) idx++;
    if (idx >= arr.length) { crypto.getRandomValues(arr); idx = 0; }
    result += chars[arr[idx] % chars.length];
    idx++;
  }
  return result;
}
