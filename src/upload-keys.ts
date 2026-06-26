import { Hono } from 'hono';
import type { Env, UploadKey } from './types';
import { jwtAuth } from './auth';

// ── Admin routes (JWT) ──
export const uploadKeyRoutes = new Hono<{ Bindings: Env }>();
uploadKeyRoutes.use('*', jwtAuth);

// Create upload key
uploadKeyRoutes.post('/', async (c) => {
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

  await c.env.DRIVE.put('_upload_keys/' + id + '.json', JSON.stringify(key), {
    httpMetadata: { contentType: 'application/json' },
  });

  return c.json({ id, url: '/u/' + id, expires: key.expires });
});

// List upload keys
uploadKeyRoutes.get('/', async (c) => {
  const listed = await c.env.DRIVE.list({ prefix: '_upload_keys/' });
  const keys: UploadKey[] = [];
  for (const obj of listed.objects) {
    try {
      const data = await c.env.DRIVE.get(obj.key);
      if (data) keys.push(JSON.parse(await data.text()));
    } catch {}
  }
  keys.sort((a, b) => (a.created > b.created ? -1 : 1));
  return c.json({ keys });
});

// Delete upload key
uploadKeyRoutes.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DRIVE.delete('_upload_keys/' + id + '.json');
  return c.json({ ok: true });
});

// ── Public route (no auth) ──
export const uploadKeyPublicRoutes = new Hono<{ Bindings: Env }>();

// Validate upload key
uploadKeyPublicRoutes.get('/validate/:id', async (c) => {
  const id = c.req.param('id');
  const data = await c.env.DRIVE.get('_upload_keys/' + id + '.json');
  if (!data) return c.json({ valid: false, error: '链接不存在' });

  const key: UploadKey = JSON.parse(await data.text());

  if (!key.active) return c.json({ valid: false, error: '链接已禁用' });
  if (new Date(key.expires) < new Date()) return c.json({ valid: false, error: '链接已过期', expired: true });

  return c.json({ valid: true, label: key.label, path: key.path });
});

function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  let result = '';
  for (let i = 0; i < arr.length; i++) result += chars[arr[i] % chars.length];
  return result;
}
