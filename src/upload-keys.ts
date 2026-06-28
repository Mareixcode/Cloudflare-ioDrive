import { Hono } from 'hono';
import type { Env, UploadKey } from './types';
import { jwtAuth } from './auth';
import { createStorageEngine } from './storage-engine';

// ── Admin routes (JWT) ──
export const uploadKeyRoutes = new Hono<{ Bindings: Env }>();
uploadKeyRoutes.use('*', jwtAuth);

// Create upload key
uploadKeyRoutes.post('/', async (c) => {
  const engine = await createStorageEngine(c.env);
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

  await engine.put('_upload_keys/' + id + '.json', JSON.stringify(key), { contentType: 'application/json' });

  return c.json({ id, url: '/u/' + id, expires: key.expires });
});

// List upload keys
uploadKeyRoutes.get('/', async (c) => {
  const engine = await createStorageEngine(c.env);
  const listed = await engine.list('_upload_keys/');
  const keys: UploadKey[] = [];
  for (const obj of listed.objects) {
    try {
      const data = await engine.get(obj.key);
      if (data) keys.push(JSON.parse(await data.text()));
    } catch {}
  }
  keys.sort((a, b) => (a.created > b.created ? -1 : 1));
  return c.json({ keys });
});

// Delete upload key
uploadKeyRoutes.delete('/:id', async (c) => {
  const engine = await createStorageEngine(c.env);
  const id = c.req.param('id');
  await engine.delete('_upload_keys/' + id + '.json');
  return c.json({ ok: true });
});

// ── Public route (no auth) ──
export const uploadKeyPublicRoutes = new Hono<{ Bindings: Env }>();

// Validate upload key
uploadKeyPublicRoutes.get('/validate/:id', async (c) => {
  const engine = await createStorageEngine(c.env);
  const id = c.req.param('id');
  const data = await engine.get('_upload_keys/' + id + '.json');
  if (!data) return c.json({ valid: false, error: '链接不存在' });

  const key: UploadKey = JSON.parse(await data.text());

  if (!key.active) return c.json({ valid: false, error: '链接已禁用' });
  if (new Date(key.expires) < new Date()) return c.json({ valid: false, error: '链接已过期', expired: true });

  return c.json({ valid: true, label: key.label, path: key.path });
});

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
