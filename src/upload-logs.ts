import { Hono } from 'hono';
import type { Env, UploadLogEntry } from './types';
import { jwtAuth } from './auth';
import { parseUA } from './ua-parser';
import { createMetadataStore } from './metadata-store';

export const uploadLogRoutes = new Hono<{ Bindings: Env }>();

uploadLogRoutes.use('*', jwtAuth);

// ── List upload logs ──
uploadLogRoutes.get('/logs', async (c) => {
  const meta = createMetadataStore(c.env);
  const { keys } = await meta.list('_ul_logs/', { limit: 500 });
  const logs: any[] = [];
  for (const key of keys) {
    try {
      const entry = await meta.get<UploadLogEntry>(key);
      if (entry) {
        logs.push({ ...entry, logKey: key + '.json' });
      }
    } catch {}
  }
  logs.sort((a, b) => (a.time > b.time ? -1 : 1));
  return c.json({ logs });
});

// ── Clear all upload logs ──
uploadLogRoutes.delete('/logs', async (c) => {
  const meta = createMetadataStore(c.env);
  let deleted = 0;
  let cursor: string | undefined;
  do {
    const { keys, cursor: nextCursor } = await meta.list('_ul_logs/', { limit: 1000, cursor });
    if (keys.length > 0) {
      await meta.delete(keys);
      deleted += keys.length;
    }
    cursor = nextCursor;
  } while (cursor);
  return c.json({ ok: true, deleted });
});

// ── Delete single upload log ──
uploadLogRoutes.delete('/logs/:logKey{.+}', async (c) => {
  const meta = createMetadataStore(c.env);
  const logKey = c.req.param('logKey');
  let key = logKey;
  if (key.endsWith('.json')) key = key.slice(0, -5);
  if (!key.startsWith('_ul_logs/')) {
    return c.json({ error: 'invalid log key' }, 400);
  }
  await meta.delete(key);
  return c.json({ ok: true });
});

// ── Helper: write upload log ──
export async function writeUploadLog(
  env: Env,
  info: {
    key: string;
    name: string;
    size: number;
    ip: string;
    country: string;
    ua: string;
    referer?: string;
    source: UploadLogEntry['source'];
    uploadKeyId?: string;
    uploadKeyLabel?: string;
  },
) {
  try {
    const meta = createMetadataStore(env);
    const parsed = parseUA(info.ua);
    const entry: UploadLogEntry = {
      time: new Date().toISOString(),
      key: info.key,
      name: info.name,
      size: info.size,
      ip: info.ip,
      country: info.country,
      ua: info.ua,
      source: info.source,
      uploadKeyId: info.uploadKeyId,
      uploadKeyLabel: info.uploadKeyLabel,
      referer: info.referer,
      browser: parsed.browser,
      os: parsed.os,
      deviceType: parsed.deviceType,
    };
    const logId = info.source + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    await meta.put('_ul_logs/' + logId, entry);
  } catch (e) {
    console.error('Failed to write upload log:', e);
  }
}
