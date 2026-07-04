// 存储配置管理 API — 在控制台中动态管理存储后端
import { Hono } from 'hono';
import type { Env, StorageBackendConfig } from './types';
import { jwtAuth } from './auth';
import { PROVIDERS, detectPathStyle } from './storage';
import type { S3Config } from './s3-upload';
import { createMetadataStore, type MetadataStore } from './metadata-store';
import { sha256Hex, hmacHex, getSigningKey } from './s3-sign';

export const storageConfigRoutes = new Hono<{ Bindings: Env }>();

// 所有存储配置路由需要 JWT 认证
storageConfigRoutes.use('*', jwtAuth);

// 配置文件 key
const CONFIG_KEY = '_config/storage';

// ── 存储配置数据结构 ────────────────────────

interface StorageConfigData {
  backends: StorageBackendConfig[];
  credentials: Record<string, { accessKey: string; secretKey: string }>;
  updatedAt: string;
}

async function loadConfig(meta: MetadataStore): Promise<StorageConfigData> {
  return (await meta.get<StorageConfigData>(CONFIG_KEY))
    || { backends: [], credentials: {}, updatedAt: '' };
}

async function saveConfig(meta: MetadataStore, data: StorageConfigData): Promise<void> {
  data.updatedAt = new Date().toISOString();
  await meta.put(CONFIG_KEY, data);
}

// ── GET /api/storage/providers — 获取支持的提供商预设 ──

storageConfigRoutes.get('/providers', (c) => {
  return c.json(PROVIDERS);
});

// ── GET /api/storage/backends — 获取所有已配置的后端 ──

storageConfigRoutes.get('/backends', async (c) => {
  const meta = createMetadataStore(c.env);
  const data = await loadConfig(meta);

  // 返回后端列表（隐藏密钥，只显示是否已配置）
  const backends = data.backends.map(b => ({
    ...b,
    hasCredentials: !!data.credentials[b.name],
    // 脱敏显示密钥
    accessKey: data.credentials[b.name]?.accessKey
      ? data.credentials[b.name].accessKey.slice(0, 6) + '***'
      : '',
    secretKey: data.credentials[b.name]?.secretKey ? '********' : '',
  }));

  return c.json({ backends, updatedAt: data.updatedAt, r2Available: !!c.env.DRIVE });
});

// ── POST /api/storage/backends — 添加新后端 ──

storageConfigRoutes.post('/backends', async (c) => {
  const meta = createMetadataStore(c.env);
  const body = await c.req.json<{
    name: string;
    provider: string;
    endpoint: string;
    bucket: string;
    region: string;
    pathStyle?: boolean;
    primary?: boolean;
    sync?: boolean;
    accessKey: string;
    secretKey: string;
  }>();

  const { name, provider, endpoint, bucket, region, accessKey, secretKey } = body;
  if (!name || !provider || !endpoint || !bucket || !region || !accessKey || !secretKey) {
    return c.json({ error: '缺少必填字段' }, 400);
  }

  const data = await loadConfig(meta);

  // 检查名称是否已存在
  if (data.backends.some(b => b.name === name)) {
    return c.json({ error: `后端「${name}」已存在` }, 409);
  }

  // 自动检测路径风格
  const pathStyle = body.pathStyle !== undefined ? body.pathStyle : detectPathStyle(endpoint, provider);

  const backend: StorageBackendConfig = {
    name,
    provider,
    endpoint,
    bucket,
    region,
    pathStyle,
    primary: body.primary || false,
    sync: body.sync !== false, // 默认同步
  };

  data.backends.push(backend);
  data.credentials[name] = { accessKey, secretKey };

  // 如果标记为主存储，取消其他后端的 primary 标记
  if (backend.primary) {
    for (const b of data.backends) {
      if (b.name !== name) b.primary = false;
    }
  }

  await saveConfig(meta, data);
  return c.json({ ok: true, backend });
});

// ── PUT /api/storage/backends/:name — 更新后端 ──

storageConfigRoutes.put('/backends/:name', async (c) => {
  const meta = createMetadataStore(c.env);
  const name = c.req.param('name');
  const body = await c.req.json<{
    provider?: string;
    endpoint?: string;
    bucket?: string;
    region?: string;
    pathStyle?: boolean;
    primary?: boolean;
    sync?: boolean;
    accessKey?: string;
    secretKey?: string;
  }>();

  const data = await loadConfig(meta);
  const idx = data.backends.findIndex(b => b.name === name);
  if (idx === -1) return c.json({ error: `后端「${name}」不存在` }, 404);

  const backend = data.backends[idx];

  // 更新字段
  if (body.provider !== undefined) backend.provider = body.provider;
  if (body.endpoint !== undefined) backend.endpoint = body.endpoint;
  if (body.bucket !== undefined) backend.bucket = body.bucket;
  if (body.region !== undefined) backend.region = body.region;
  if (body.pathStyle !== undefined) backend.pathStyle = body.pathStyle;
  if (body.sync !== undefined) backend.sync = body.sync;

  // 更新密钥（如果提供了新的，且不是掩码）
  if (body.accessKey || body.secretKey) {
    const cred = data.credentials[name] || { accessKey: '', secretKey: '' };
    if (body.accessKey && !body.accessKey.includes('***')) {
      cred.accessKey = body.accessKey;
    }
    if (body.secretKey && !body.secretKey.includes('***') && body.secretKey !== '********') {
      cred.secretKey = body.secretKey;
    }
    data.credentials[name] = cred;
  }

  // 处理 primary 标记
  if (body.primary !== undefined) {
    backend.primary = body.primary;
    if (body.primary) {
      for (const b of data.backends) {
        if (b.name !== name) b.primary = false;
      }
    }
  }

  // 重新检测路径风格（如果 endpoint 或 provider 变了，且用户未显式指定 pathStyle）
  if ((body.endpoint || body.provider) && body.pathStyle === undefined) {
    backend.pathStyle = detectPathStyle(backend.endpoint, backend.provider);
  }

  await saveConfig(meta, data);
  return c.json({ ok: true, backend });
});

// ── DELETE /api/storage/backends/:name — 删除后端 ──

storageConfigRoutes.delete('/backends/:name', async (c) => {
  const meta = createMetadataStore(c.env);
  const name = c.req.param('name');
  const data = await loadConfig(meta);

  const idx = data.backends.findIndex(b => b.name === name);
  if (idx === -1) return c.json({ error: `后端「${name}」不存在` }, 404);

  data.backends.splice(idx, 1);
  delete data.credentials[name];

  await saveConfig(meta, data);
  return c.json({ ok: true });
});

// ── POST /api/storage/test — 测试后端连通性 ──

storageConfigRoutes.post('/test', async (c) => {
  const body = await c.req.json<{
    endpoint: string;
    bucket: string;
    region: string;
    accessKey: string;
    secretKey: string;
    pathStyle?: boolean;
    provider?: string;
  }>();

  const { endpoint, bucket, region, accessKey, secretKey } = body;
  if (!endpoint || !bucket || !region || !accessKey || !secretKey) {
    return c.json({ error: '缺少必填字段' }, 400);
  }

  // 优先使用前端传入的 pathStyle，否则根据 provider/endpoint 自动检测
  const pathStyle = body.pathStyle !== undefined ? body.pathStyle : detectPathStyle(endpoint, body.provider);

  try {
    // 构造 ListObjectsV2 请求来测试连通性
    const host = pathStyle ? endpoint : `${bucket}.${endpoint}`;
    const urlPath = pathStyle ? `/${bucket}?list-type=2&max-keys=1` : '/?list-type=2&max-keys=1';
    const amzDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '') + 'Z';
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

    const headers: Record<string, string> = {
      'Host': host,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'x-amz-date': amzDate,
    };

    // 签名
    const signedHeaderNames = ['host', 'x-amz-content-sha256', 'x-amz-date'];
    const signedHeaders = signedHeaderNames.join(';');
    const canonicalHeaders = signedHeaderNames.map(k => `${k}:${headers[k]}`).join('\n') + '\n';

    const canonicalRequest = [
      'GET', urlPath.split('?')[0], urlPath.split('?')[1] || '',
      canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');
    const signingKey = await getSigningKey(secretKey, dateStamp, region, 's3');
    const signature = await hmacHex(signingKey, stringToSign);

    headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(`https://${host}${urlPath}`, {
      method: 'GET',
      headers,
    });

    if (res.ok) {
      return c.json({ ok: true, message: '连接成功' });
    } else {
      const errText = await res.text().catch(() => '');
      return c.json({ ok: false, error: `HTTP ${res.status}: ${res.statusText}`, detail: errText.slice(0, 500) });
    }
  } catch (e: any) {
    return c.json({ ok: false, error: e?.message || String(e) });
  }
});

// ── POST /api/storage/status — 检测后端状态 ──

storageConfigRoutes.post('/status', async (c) => {
  const body = await c.req.json<{ name: string }>();
  const { name } = body;
  if (!name) return c.json({ error: '缺少后端名称' }, 400);

  const start = Date.now();

  try {
    // 检测 R2 内置存储
    if (name === '_r2_') {
      if (!c.env.DRIVE) return c.json({ ok: false, error: 'R2 绑定未配置', responseTime: 0 });
      const listed = await c.env.DRIVE.list({ limit: 1 });
      const responseTime = Date.now() - start;
      return c.json({ ok: true, responseTime, fileCount: listed.objects.length > 0 ? '1+' : 0 });
    }

    // 检测 S3 后端
    const meta = createMetadataStore(c.env);
    const data = await loadConfig(meta);
    const backend = data.backends.find(b => b.name === name);
    if (!backend) return c.json({ ok: false, error: `后端「${name}」不存在`, responseTime: 0 });

    const cred = data.credentials[name];
    if (!cred) return c.json({ ok: false, error: '未配置密钥', responseTime: 0 });

    const pathStyle = backend.pathStyle !== undefined ? backend.pathStyle : detectPathStyle(backend.endpoint, backend.provider);
    const host = pathStyle ? backend.endpoint : `${backend.bucket}.${backend.endpoint}`;
    const urlPath = pathStyle ? `/${backend.bucket}?list-type=2&max-keys=1` : '/?list-type=2&max-keys=1';
    const amzDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '') + 'Z';
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${backend.region}/s3/aws4_request`;

    const headers: Record<string, string> = {
      'Host': host,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'x-amz-date': amzDate,
    };

    const signedHeaderNames = ['host', 'x-amz-content-sha256', 'x-amz-date'];
    const signedHeaders = signedHeaderNames.join(';');
    const canonicalHeaders = signedHeaderNames.map(k => `${k}:${headers[k]}`).join('\n') + '\n';

    const canonicalRequest = [
      'GET', urlPath.split('?')[0], urlPath.split('?')[1] || '',
      canonicalHeaders, signedHeaders, 'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');
    const signingKey = await getSigningKey(cred.secretKey, dateStamp, backend.region, 's3');
    const signature = await hmacHex(signingKey, stringToSign);

    headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${cred.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(`https://${host}${urlPath}`, { method: 'GET', headers });
    const responseTime = Date.now() - start;

    if (res.ok) {
      const xml = await res.text();
      // 尝试从 XML 中提取文件数量（简化处理）
      const isTruncated = xml.includes('<IsTruncated>true</IsTruncated>');
      const contents = xml.split('<Contents>').length - 1;
      const prefixes = xml.split('<CommonPrefixes>').length - 1;
      const count = contents + prefixes;
      return c.json({ ok: true, responseTime, fileCount: isTruncated ? `${count}+` : count });
    } else {
      const errText = await res.text().catch(() => '');
      return c.json({ ok: false, responseTime, error: `HTTP ${res.status}: ${res.statusText}`, detail: errText.slice(0, 300) });
    }
  } catch (e: any) {
    return c.json({ ok: false, responseTime: Date.now() - start, error: e?.message || String(e) });
  }
});

