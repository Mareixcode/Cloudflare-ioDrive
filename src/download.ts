import { Hono } from 'hono';
import type { Env, DownloadLogEntry } from './types';
import { jwtAuth } from './auth';
import { parseUA } from './ua-parser';
import { verifyTurnstile } from './turnstile';
import { getAllS3ConfigsAsync, detectPathStyle } from './storage';
import { createStorageEngine } from './storage-engine';
import { createMetadataStore } from './metadata-store';
import { incrementShareDownload } from './share';
import { sha256Hex, hmacHex, getSigningKey } from './s3-sign';

export const downloadRoutes = new Hono<{ Bindings: Env }>();

// ── Download logs (MUST be before /url/:key to avoid wildcard catch) ──
downloadRoutes.get('/logs', jwtAuth, async (c) => {
  const meta = createMetadataStore(c.env);
  const { keys } = await meta.list('_dl_logs/', { limit: 500 });
  const logs: any[] = [];
  for (const key of keys) {
    try {
      const entry = await meta.get<DownloadLogEntry>(key);
      if (entry) {
        logs.push({ ...entry, logKey: key + '.json' });
      }
    } catch {}
  }
  logs.sort((a, b) => (a.time > b.time ? -1 : 1));
  return c.json({ logs });
});

// ── Clear all download logs (JWT) ──
downloadRoutes.delete('/logs', jwtAuth, async (c) => {
  const meta = createMetadataStore(c.env);
  let deleted = 0;
  let cursor: string | undefined;
  do {
    const { keys, cursor: nextCursor } = await meta.list('_dl_logs/', { limit: 1000, cursor });
    if (keys.length > 0) {
      await meta.delete(keys);
      deleted += keys.length;
    }
    cursor = nextCursor;
  } while (cursor);
  return c.json({ ok: true, deleted });
});

// ── Delete single download log (JWT) ──
downloadRoutes.delete('/logs/:logKey{.+}', jwtAuth, async (c) => {
  const meta = createMetadataStore(c.env);
  const logKey = c.req.param('logKey');
  let key = logKey;
  if (key.endsWith('.json')) key = key.slice(0, -5);
  if (!key.startsWith('_dl_logs/')) {
    return c.json({ error: 'invalid log key' }, 400);
  }
  await meta.delete(key);
  return c.json({ ok: true });
});

// ── Dashboard: redirect to storage (legacy) ─────
downloadRoutes.get('/url/:key{.+}', jwtAuth, async (c) => {
  const key = c.req.param('key');
  const domain = c.env.PUBLIC_DOMAIN || new URL(c.req.url).host;
  const encoded = key.split('/').map(encodeURIComponent).join('/');
  return c.redirect('https://' + domain + '/' + encoded, 302);
});

// ── Dashboard: presigned URL with tracking (JWT) ──
downloadRoutes.get('/presign/:key{.+}', jwtAuth, async (c) => {
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  const key = c.req.param('key');
  const head = await engine.head(key);
  if (!head) return c.json({ error: '文件不存在' }, 404);

  const ip = c.req.header('CF-Connecting-IP') || '';
  const ua = c.req.header('User-Agent') || '';
  const parsed = parseUA(ua);
  const name = key.split('/').pop() || key;

  // 预签名 URL：从 S3 后端生成
  let presignedUrl: string | null = null;
  let source = 's3';

  const s3Configs = await getAllS3ConfigsAsync(c.env);
  if (s3Configs.length > 0) {
    const cfg = s3Configs[0];
    presignedUrl = await generatePresignedUrl(
      cfg.endpoint, cfg.bucket, cfg.region,
      cfg.accessKey, cfg.secretKey,
      key, 300, name,
      cfg.pathStyle,
    );
  }

  if (!presignedUrl) {
    return c.json({ error: '存储凭证未配置（需要配置 S3 兼容后端）' }, 500);
  }

  const logEntry: DownloadLogEntry = {
    time: new Date().toISOString(),
    key,
    name,
    size: head.size,
    ip,
    country: c.req.header('CF-IPCountry') || '',
    ua,
    shareToken: 'direct',
    source,
    referer: c.req.header('Referer') || '',
    browser: parsed.browser,
    os: parsed.os,
    deviceType: parsed.deviceType,
  };
  const logId = 'direct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const logKey = '_dl_logs/' + logId;
  await meta.put(logKey, logEntry);

  return c.json({ url: presignedUrl, logKey: logKey + '.json', name, size: head.size });
});

// ── Share: Turnstile verified → presigned URLs ──
downloadRoutes.post('/token', async (c) => {
  const engine = await createStorageEngine(c.env);
  const meta = createMetadataStore(c.env);
  const body = await c.req.json<{ shareToken: string; turnstile: string }>();
  const { shareToken, turnstile } = body;

  if (!shareToken || !turnstile) return c.json({ error: '参数不完整' }, 400);

  const ip = c.req.header('CF-Connecting-IP') || '';
  if (!(await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET, ip))) {
    return c.json({ error: '人机验证失败' }, 403);
  }

  const record = await incrementShareDownload(meta, shareToken);
  if (!record) return c.json({ error: '分享链接不存在' }, 404);

  const head = await engine.head(record.key);
  if (!head) return c.json({ error: '文件不存在' }, 404);

  // S3 presigned URLs (支持多后端 + path-style)
  const s3Urls: { name: string; url: string }[] = [];
  try {
    const s3Configs = await getAllS3ConfigsAsync(c.env);
    for (const cfg of s3Configs) {
      try {
        const url = await generatePresignedUrl(
          cfg.endpoint, cfg.bucket, cfg.region,
          cfg.accessKey, cfg.secretKey,
          record.key, 300, record.name,
          cfg.pathStyle,
        );
        s3Urls.push({ name: cfg.bucket, url });
      } catch (e) {
        console.error(`S3 presign error (${cfg.bucket}):`, e);
      }
    }
  } catch (e) {
    console.error('S3 presign error:', e);
  }

  const primaryUrl = s3Urls.length > 0 ? s3Urls[0].url : null;
  if (!primaryUrl) return c.json({ error: '生成下载链接失败' }, 500);

  // Log download with detailed tracking
  const ua = c.req.header('User-Agent') || '';
  const parsed = parseUA(ua);
  const logEntry: DownloadLogEntry = {
    time: new Date().toISOString(),
    key: record.key,
    name: record.name,
    size: head.size,
    ip: ip,
    country: c.req.header('CF-IPCountry') || '',
    ua,
    shareToken,
    source: 's3',
    referer: c.req.header('Referer') || '',
    browser: parsed.browser,
    os: parsed.os,
    deviceType: parsed.deviceType,
  };
  const logId = shareToken + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const logKey = '_dl_logs/' + logId;
  await meta.put(logKey, logEntry);

  const s3Url = s3Urls.length > 0 ? s3Urls[0].url : null;
  return c.json({ r2Url: primaryUrl, s3Url, s3Urls, logKey: logKey + '.json', name: record.name, size: head.size });
});

// ── Beacon: update download completion status ──
downloadRoutes.post('/beacon', async (c) => {
  const meta = createMetadataStore(c.env);
  const { logKey, event } = await c.req.json<{ logKey: string; event: string }>();
  if (!logKey || !event) return c.json({ error: 'missing params' }, 400);

  // 校验 logKey 必须以 _dl_logs/ 开头，防止读写任意对象
  let key = logKey;
  if (key.endsWith('.json')) key = key.slice(0, -5);
  if (!key.startsWith('_dl_logs/')) {
    return c.json({ error: 'invalid log key' }, 400);
  }

  if (event === 'complete') {
    try {
      const entry = await meta.get<DownloadLogEntry>(key);
      if (entry) {
        entry.completed = true;
        await meta.put(key, entry);
      }
    } catch {}
  }

  return c.json({ ok: true });
});

// ── S3 Signature V4 Presigned URL ──────────

async function generatePresignedUrl(
  endpoint: string,
  bucket: string,
  region: string,
  accessKey: string,
  secretKey: string,
  key: string,
  expiresIn: number,
  filename: string,
  pathStyle?: boolean,
): Promise<string> {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '').slice(0, 8);
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '') + 'Z';

  const encodedKey = '/' + encodeURIComponent(key).replace(/%2F/g, '/');
  let host: string;
  if (pathStyle) {
    host = endpoint;
  } else {
    host = bucket + '.' + endpoint;
  }

  const credentialScope = dateStamp + '/' + region + '/s3/aws4_request';
  const credential = accessKey + '/' + credentialScope;

  const rawParams: [string, string][] = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', 'host'],
  ];
  rawParams.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const canonicalQS = rawParams.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');

  const canonicalUri = pathStyle ? '/' + bucket + encodedKey : encodedKey;

  const canonicalRequest = ['GET', canonicalUri, canonicalQS, 'host:' + host + '\n', 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');
  const signingKey = await getSigningKey(secretKey, dateStamp, region, 's3');
  const signature = await hmacHex(signingKey, stringToSign);
  const urlParams = rawParams.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');

  const urlPath = pathStyle ? '/' + bucket + encodedKey : encodedKey;
  return 'https://' + host + urlPath + '?' + urlParams + '&X-Amz-Signature=' + signature;
}

