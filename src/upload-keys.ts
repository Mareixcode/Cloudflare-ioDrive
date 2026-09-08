import { Hono } from 'hono';
import type { Env, UploadKey } from './types';
import { jwtAuth } from './auth';
import { createMetadataStore } from './metadata-store';
import { normalizeUploadDirectory } from './storage-path';

const UPLOAD_KEYS_PREFIX = '_upload_keys/';

function isValidUploadKeyId(id: string): boolean {
  return /^[A-Za-z0-9]{12}$/.test(id);
}

export async function getUploadKeyRecord(meta: ReturnType<typeof createMetadataStore>, id: string): Promise<UploadKey | null> {
  if (!isValidUploadKeyId(id)) return null;
  return meta.get<UploadKey>(UPLOAD_KEYS_PREFIX + id);
}

// ── Admin routes (JWT) ──
export const uploadKeyRoutes = new Hono<{ Bindings: Env }>();
uploadKeyRoutes.use('*', jwtAuth);

// Create upload key
uploadKeyRoutes.post('/', async (c) => {
  const meta = createMetadataStore(c.env);
  const body = await c.req.json<{ label: string; path: string; expiresHours: number }>();
  const { label, expiresHours } = body;
  let path: string;
  try {
    path = normalizeUploadDirectory(body.path || 'uploads/');
  } catch {
    return c.json({ error: '上传路径无效' }, 400);
  }

  if (!label) return c.json({ error: '缺少标签' }, 400);
  if (label.length > 100) return c.json({ error: '标签过长' }, 400);
  if (!Number.isFinite(expiresHours) || expiresHours <= 0 || expiresHours > 8760) return c.json({ error: '有效期无效' }, 400);

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
    } catch (error) {
      console.warn(`Skipping invalid upload key ${k}:`, error);
    }
  }
  out.sort((a, b) => (a.created > b.created ? -1 : 1));
  return c.json({ keys: out });
});

// Delete upload key
uploadKeyRoutes.delete('/:id', async (c) => {
  const meta = createMetadataStore(c.env);
  const id = c.req.param('id');
  if (!isValidUploadKeyId(id)) return c.json({ error: '链接不存在' }, 404);
  await meta.delete(UPLOAD_KEYS_PREFIX + id);
  return c.json({ ok: true });
});

// ── Public route (no auth) ──
export const uploadKeyPublicRoutes = new Hono<{ Bindings: Env }>();

// Validate upload key
uploadKeyPublicRoutes.get('/validate/:id', async (c) => {
  const meta = createMetadataStore(c.env);
  const id = c.req.param('id');
  const key = await getUploadKeyRecord(meta, id);
  if (!key) return c.json({ valid: false, error: '链接不存在' });

  if (!key.active) return c.json({ valid: false, error: '链接已禁用' });
  if (new Date(key.expires) < new Date()) return c.json({ valid: false, error: '链接已过期', expired: true });

  return c.json({ valid: true, label: key.label, path: key.path });
});

/**
 * 原子递增 usedCount
 */
export async function incrementUploadKeyUsage(meta: ReturnType<typeof createMetadataStore>, id: string): Promise<UploadKey | null> {
  if (!isValidUploadKeyId(id)) return null;
  return meta.incrementCounter<UploadKey>(UPLOAD_KEYS_PREFIX + id, 'usedCount');
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
