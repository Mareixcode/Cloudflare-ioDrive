// 内容审核 管理员 API
// GET/PUT/POST /api/moderation/config
// GET/DELETE /api/moderation/logs

import { Hono } from 'hono';
import type { Env, ModerationConfig, ModerationLogEntry } from './types';
import { jwtAuth } from './auth';
import { createMetadataStore } from './metadata-store';
import { createModerationProvider, MODERATION_LOG_PREFIX } from './moderation';

const MODERATION_CONFIG_KEY = '_config/moderation';

export const moderationAdminRoutes = new Hono<{ Bindings: Env }>();
moderationAdminRoutes.use('*', jwtAuth);

const DEFAULT_CONFIG: ModerationConfig = {
  enabled: false,
  provider: 'none',
  fileTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  maxSize: 20 * 1024 * 1024,
  thresholds: { adult: 0.9, racy: 0.7 },
};

// GET /api/moderation/config
moderationAdminRoutes.get('/config', async (c) => {
  const meta = createMetadataStore(c.env);
  const cfg = await meta.get<ModerationConfig>(MODERATION_CONFIG_KEY);
  // 隐藏敏感字段
  const safe = cfg ? { ...cfg, apiKey: cfg.apiKey ? '***' + cfg.apiKey.slice(-4) : '' } : DEFAULT_CONFIG;
  return c.json(safe);
});

// PUT /api/moderation/config
moderationAdminRoutes.put('/config', async (c) => {
  const body = await c.req.json<ModerationConfig>();
  if (!body.provider || !['moderatecontent', 'nsfwjs', 'none'].includes(body.provider)) {
    return c.json({ error: 'invalid provider' }, 400);
  }
  if (body.enabled && body.provider !== 'none') {
    if (body.provider === 'moderatecontent' && !body.apiKey) {
      return c.json({ error: 'moderatecontent 需要 apiKey' }, 400);
    }
    if (body.provider === 'nsfwjs' && !body.apiPath) {
      return c.json({ error: 'nsfwjs 需要 apiPath' }, 400);
    }
  }
  const meta = createMetadataStore(c.env);
  const existingCfg = await meta.get<ModerationConfig>(MODERATION_CONFIG_KEY);

  let apiKey = body.apiKey;
  if (apiKey && apiKey.startsWith('***')) {
    apiKey = existingCfg?.apiKey;
  }

  const cfg: ModerationConfig = {
    enabled: !!body.enabled,
    provider: body.provider,
    apiKey,
    apiPath: body.apiPath,
    thresholds: body.thresholds,
    fileTypes: body.fileTypes?.length ? body.fileTypes : DEFAULT_CONFIG.fileTypes,
    maxSize: body.maxSize || DEFAULT_CONFIG.maxSize,
    updatedAt: new Date().toISOString(),
  };
  await meta.put(MODERATION_CONFIG_KEY, cfg);
  return c.json({ ok: true, config: { ...cfg, apiKey: cfg.apiKey ? '***' + cfg.apiKey.slice(-4) : '' } });
});

// POST /api/moderation/test
moderationAdminRoutes.post('/test', async (c) => {
  const body = await c.req.json<{ url: string }>();
  if (!body.url) return c.json({ error: 'missing url' }, 400);

  const meta = createMetadataStore(c.env);
  const cfg = await meta.get<ModerationConfig>(MODERATION_CONFIG_KEY);
  if (!cfg) return c.json({ error: 'no moderation config' }, 400);
  const provider = createModerationProvider(cfg);
  if (!provider) return c.json({ error: 'provider not configured' }, 400);

  try {
    const result = await provider.moderate({ url: body.url, contentType: 'image/*', size: 0 });
    return c.json({ ok: true, result });
  } catch (e: any) {
    return c.json({ ok: false, error: e?.message || String(e) }, 500);
  }
});

// GET /api/moderation/logs
moderationAdminRoutes.get('/logs', async (c) => {
  const meta = createMetadataStore(c.env);
  const { keys } = await meta.list(MODERATION_LOG_PREFIX, { limit: 500 });
  const logs: ModerationLogEntry[] = [];
  for (const key of keys) {
    const entry = await meta.get<ModerationLogEntry>(key);
    if (entry) logs.push(entry);
  }
  logs.sort((a, b) => b.time.localeCompare(a.time));
  return c.json({ entries: logs });
});

// DELETE /api/moderation/logs
moderationAdminRoutes.delete('/logs', async (c) => {
  const meta = createMetadataStore(c.env);
  let deleted = 0;
  let cursor: string | undefined;
  do {
    const { keys, cursor: next } = await meta.list(MODERATION_LOG_PREFIX, { limit: 1000, cursor });
    if (keys.length > 0) {
      await meta.delete(keys);
      deleted += keys.length;
    }
    cursor = next;
  } while (cursor);
  return c.json({ ok: true, deleted });
});

// DELETE /api/moderation/logs/:id
moderationAdminRoutes.delete('/logs/:id', async (c) => {
  const meta = createMetadataStore(c.env);
  const id = c.req.param('id');
  await meta.delete(MODERATION_LOG_PREFIX + id);
  return c.json({ ok: true });
});
