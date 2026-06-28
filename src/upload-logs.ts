import { Hono } from 'hono';
import type { Env, UploadLogEntry } from './types';
import { jwtAuth } from './auth';
import { parseUA } from './ua-parser';
import { createStorageEngine } from './storage-engine';

export const uploadLogRoutes = new Hono<{ Bindings: Env }>();

uploadLogRoutes.use('*', jwtAuth);

// ── List upload logs ──
uploadLogRoutes.get('/logs', async (c) => {
  const engine = await createStorageEngine(c.env);
  const listed = await engine.list('_ul_logs/', { limit: 500 });
  const logs: any[] = [];
  for (const obj of listed.objects) {
    try {
      const data = await engine.get(obj.key);
      if (data) {
        const entry = JSON.parse(await data.text());
        entry.logKey = obj.key;
        logs.push(entry);
      }
    } catch {}
  }
  logs.sort((a, b) => (a.time > b.time ? -1 : 1));
  return c.json({ logs });
});

// ── Clear all upload logs ──
uploadLogRoutes.delete('/logs', async (c) => {
  const engine = await createStorageEngine(c.env);
  let deleted = 0;
  let cursor: string | undefined;
  do {
    const listed = await engine.list('_ul_logs/', { limit: 1000, cursor });
    const keys = listed.objects.map((o) => o.key);
    if (keys.length > 0) {
      await engine.delete(keys);
      deleted += keys.length;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return c.json({ ok: true, deleted });
});

// ── Delete single upload log ──
uploadLogRoutes.delete('/logs/:logKey{.+}', async (c) => {
  const engine = await createStorageEngine(c.env);
  const logKey = c.req.param('logKey');
  if (!logKey.startsWith('_ul_logs/')) {
    return c.json({ error: 'invalid log key' }, 400);
  }
  await engine.delete(logKey);
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
    const engine = await createStorageEngine(env);
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
  await engine.put('_ul_logs/' + logId + '.json', JSON.stringify(entry), { contentType: 'application/json' });
  } catch (e) {
    console.error('Failed to write upload log:', e);
  }
}
