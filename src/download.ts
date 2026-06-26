import { Hono } from 'hono';
import type { Env, DownloadLogEntry } from './types';
import { jwtAuth } from './auth';
import { parseUA } from './ua-parser';
import { verifyTurnstile } from './turnstile';

export const downloadRoutes = new Hono<{ Bindings: Env }>();

// ── Download logs (MUST be before /url/:key to avoid wildcard catch) ──
downloadRoutes.get('/logs', jwtAuth, async (c) => {
  const listed = await c.env.DRIVE.list({ prefix: '_dl_logs/', limit: 500 });
  const logs: any[] = [];
  for (const obj of listed.objects) {
    try {
      const data = await c.env.DRIVE.get(obj.key);
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

// ── Clear all download logs (JWT) ──
downloadRoutes.delete('/logs', jwtAuth, async (c) => {
  let deleted = 0;
  let cursor: string | undefined;
  do {
    const listed = await c.env.DRIVE.list({ prefix: '_dl_logs/', limit: 1000, cursor });
    const keys = listed.objects.map((o) => o.key);
    if (keys.length > 0) {
      await c.env.DRIVE.delete(keys);
      deleted += keys.length;
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
  return c.json({ ok: true, deleted });
});

// ── Delete single download log (JWT) ──
downloadRoutes.delete('/logs/:logKey{.+}', jwtAuth, async (c) => {
  const logKey = c.req.param('logKey');
  if (!logKey.startsWith('_dl_logs/')) {
    return c.json({ error: 'invalid log key' }, 400);
  }
  await c.env.DRIVE.delete(logKey);
  return c.json({ ok: true });
});

// ── Dashboard: redirect to R2 (legacy) ─────
downloadRoutes.get('/url/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const r2Domain = c.env.R2_PUBLIC_DOMAIN;
  const encoded = key.split('/').map(encodeURIComponent).join('/');
  return c.redirect('https://' + r2Domain + '/' + encoded, 302);
});

// ── Dashboard: presigned URL with tracking (JWT) ──
downloadRoutes.get('/presign/:key{.+}', jwtAuth, async (c) => {
  const key = c.req.param('key');
  const head = await c.env.DRIVE.head(key);
  if (!head) return c.json({ error: '文件不存在' }, 404);

  if (!c.env.R2_ACCESS_KEY || !c.env.R2_SECRET_KEY) {
    return c.json({ error: 'R2 凭证未配置（R2_ACCESS_KEY / R2_SECRET_KEY）' }, 500);
  }

  const ip = c.req.header('CF-Connecting-IP') || '';
  const ua = c.req.header('User-Agent') || '';
  const parsed = parseUA(ua);
  const name = key.split('/').pop() || key;

  const r2AccountId = c.env.R2_ACCOUNT_ID;
  const r2Url = await generatePresignedUrl(
    r2AccountId + '.r2.cloudflarestorage.com',
    c.env.R2_BUCKET, 'auto',
    c.env.R2_ACCESS_KEY, c.env.R2_SECRET_KEY,
    key, 300, name,
  );

  const logEntry: DownloadLogEntry = {
    time: new Date().toISOString(),
    key,
    name,
    size: head.size,
    ip,
    country: c.req.header('CF-IPCountry') || '',
    ua,
    shareToken: 'direct',
    source: 'r2',
    referer: c.req.header('Referer') || '',
    browser: parsed.browser,
    os: parsed.os,
    deviceType: parsed.deviceType,
  };
  const logId = 'direct_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const logKey = '_dl_logs/' + logId + '.json';
  await c.env.DRIVE.put(logKey, JSON.stringify(logEntry), { httpMetadata: { contentType: 'application/json' } });

  return c.json({ url: r2Url, logKey, name, size: head.size });
});

// ── Share: Turnstile verified → presigned URLs ──
downloadRoutes.post('/token', async (c) => {
  const body = await c.req.json<{ shareToken: string; turnstile: string }>();
  const { shareToken, turnstile } = body;

  if (!shareToken || !turnstile) return c.json({ error: '参数不完整' }, 400);

  const ip = c.req.header('CF-Connecting-IP') || '';
  if (!(await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET, ip))) {
    return c.json({ error: '人机验证失败' }, 403);
  }

  const shareData = await c.env.DRIVE.get('_shares/' + shareToken + '.json');
  if (!shareData) return c.json({ error: '分享链接不存在' }, 404);

  const record = JSON.parse(await shareData.text());
  record.downloads = (record.downloads || 0) + 1;
  await c.env.DRIVE.put('_shares/' + shareToken + '.json', JSON.stringify(record));

  const head = await c.env.DRIVE.head(record.key);
  if (!head) return c.json({ error: '文件不存在' }, 404);

  // R2 presigned URL
  let r2Url: string | null = null;
  if (!c.env.R2_ACCESS_KEY || !c.env.R2_SECRET_KEY) {
    console.error('R2 presign skipped: R2_ACCESS_KEY or R2_SECRET_KEY not configured');
  } else {
    try {
      const r2AccountId = c.env.R2_ACCOUNT_ID;
      r2Url = await generatePresignedUrl(
        r2AccountId + '.r2.cloudflarestorage.com',
        c.env.R2_BUCKET, 'auto',
        c.env.R2_ACCESS_KEY, c.env.R2_SECRET_KEY,
        record.key, 300, record.name,
      );
    } catch (e) {
      console.error('R2 presign error:', e);
    }
  }
  if (!r2Url) return c.json({ error: '生成下载链接失败' }, 500);

  // S3 presigned URL
  let s3Url: string | null = null;
  try {
    if (c.env.S3_ENDPOINT && c.env.S3_BUCKET && c.env.S3_REGION && c.env.S3_ACCESS_KEY && c.env.S3_SECRET_KEY) {
      s3Url = await generatePresignedUrl(
        c.env.S3_ENDPOINT, c.env.S3_BUCKET, c.env.S3_REGION,
        c.env.S3_ACCESS_KEY, c.env.S3_SECRET_KEY,
        record.key, 300, record.name,
      );
    }
  } catch (e) {
    console.error('S3 presign error:', e);
  }

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
    source: s3Url ? 'r2+s3' : 'r2',
    referer: c.req.header('Referer') || '',
    browser: parsed.browser,
    os: parsed.os,
    deviceType: parsed.deviceType,
  };
  const logId = shareToken + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const logKey = '_dl_logs/' + logId + '.json';
  await c.env.DRIVE.put(logKey, JSON.stringify(logEntry), { httpMetadata: { contentType: 'application/json' } });

  return c.json({ r2Url, s3Url, logKey, name: record.name, size: head.size });
});

// ── Beacon: update download completion status ──
downloadRoutes.post('/beacon', async (c) => {
  const { logKey, event } = await c.req.json<{ logKey: string; event: string }>();
  if (!logKey || !event) return c.json({ error: 'missing params' }, 400);

  if (event === 'complete') {
    try {
      const existing = await c.env.DRIVE.get(logKey);
      if (existing) {
        const entry = JSON.parse(await existing.text());
        entry.completed = true;
        await c.env.DRIVE.put(logKey, JSON.stringify(entry), {
          httpMetadata: { contentType: 'application/json' },
        });
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
): Promise<string> {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '').slice(0, 8);
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '') + 'Z';
  const host = bucket + '.' + endpoint;
  const credentialScope = dateStamp + '/' + region + '/s3/aws4_request';
  const credential = accessKey + '/' + credentialScope;
  const encodedKey = '/' + encodeURIComponent(key).replace(/%2F/g, '/');

  const rawParams: [string, string][] = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', credential],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', 'host'],
  ];
  rawParams.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

  const canonicalQS = rawParams.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
  const canonicalRequest = ['GET', encodedKey, canonicalQS, 'host:' + host + '\n', 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');
  const signingKey = await getSigningKey(secretKey, dateStamp, region, 's3');
  const signature = await hmacHex(signingKey, stringToSign);
  const urlParams = rawParams.map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
  return 'https://' + host + encodedKey + '?' + urlParams + '&X-Amz-Signature=' + signature;
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacBytes(key: CryptoKey | Uint8Array, data: string): Promise<Uint8Array> {
  const k = key instanceof Uint8Array
    ? await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    : key;
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
}

async function hmacHex(key: CryptoKey | Uint8Array, data: string): Promise<string> {
  return [...await hmacBytes(key, data)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getSigningKey(secret: string, date: string, region: string, service: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const kSecret = await crypto.subtle.importKey('raw', enc.encode('AWS4' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const kDate = await hmacBytes(kSecret, date);
  const kDateKey = await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const kRegion = await hmacBytes(kDateKey, region);
  const kRegionKey = await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const kService = await hmacBytes(kRegionKey, service);
  const kServiceKey = await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return await hmacBytes(kServiceKey, 'aws4_request');
}
