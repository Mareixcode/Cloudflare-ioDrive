// 存储抽象层 — Provider 预设、路径风格检测、多后端配置解析
import type { Env, StorageBackendConfig } from './types';
import type { S3Config } from './s3-upload';

// ── 运行时配置缓存 ──────────────────────────

let _runtimeConfig: { backends: StorageBackendConfig[]; credentials: Record<string, { accessKey: string; secretKey: string }> } | null = null;

/**
 * 从 R2 加载运行时存储配置（控制台中配置的）。
 * 如果 R2 中没有配置，返回 null，回退到环境变量。
 */
async function loadRuntimeConfig(drive: R2Bucket): Promise<typeof _runtimeConfig> {
  try {
    if (_runtimeConfig) return _runtimeConfig;
    const obj = await drive.get('_config/storage.json');
    if (!obj) return null;
    const data = JSON.parse(await obj.text());
    if (data.backends?.length > 0) {
      _runtimeConfig = { backends: data.backends, credentials: data.credentials || {} };
      return _runtimeConfig;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Provider 预设 ─────────────────────────────

export interface ProviderPreset {
  name: string;
  endpoint: string;           // 默认 endpoint 模板（含 <account_id> 占位符）
  regions: string[];          // 支持的区域列表
  pathStyle: boolean;         // 默认路径风格
  endpointPlaceholder?: string; // setup 脚本中的 endpoint 提示
}

export const PROVIDERS: Record<string, ProviderPreset> = {
  aws: {
    name: 'AWS S3',
    endpoint: 's3.amazonaws.com',
    regions: [
      'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
      'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-north-1',
      'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
      'ap-south-1', 'sa-east-1', 'ca-central-1', 'me-south-1', 'af-south-1',
    ],
    pathStyle: false,
  },
  r2: {
    name: 'Cloudflare R2',
    endpoint: '<account_id>.r2.cloudflarestorage.com',
    regions: ['auto'],
    pathStyle: false,
    endpointPlaceholder: 'YOUR_ACCOUNT_ID.r2.cloudflarestorage.com',
  },
  b2: {
    name: 'Backblaze B2',
    endpoint: 's3.<region>.backblazeb2.com',
    regions: ['us-west-004', 'us-west-002', 'eu-central-003', 'ap-southeast-002'],
    pathStyle: false,
    endpointPlaceholder: 's3.us-west-004.backblazeb2.com',
  },
  minio: {
    name: 'MinIO (自建)',
    endpoint: '',
    regions: ['us-east-1'],
    pathStyle: true,
    endpointPlaceholder: 'minio.example.com:9000',
  },
  alibaba: {
    name: '阿里云 OSS',
    endpoint: 'oss-<region>.aliyuncs.com',
    regions: [
      'cn-hangzhou', 'cn-shanghai', 'cn-beijing', 'cn-shenzhen', 'cn-guangzhou',
      'cn-chengdu', 'cn-hongkong', 'ap-southeast-1', 'ap-southeast-5',
      'us-west-1', 'us-east-1', 'eu-central-1', 'eu-west-1',
    ],
    pathStyle: false,
    endpointPlaceholder: 'oss-cn-hangzhou.aliyuncs.com',
  },
  tencent: {
    name: '腾讯云 COS',
    endpoint: 'cos.<region>.myqcloud.com',
    regions: [
      'ap-guangzhou', 'ap-shanghai', 'ap-beijing', 'ap-chengdu',
      'ap-nanjing', 'ap-hongkong', 'ap-singapore', 'ap-mumbai',
      'na-siliconvalley', 'eu-frankfurt', 'sa-saopaulo',
    ],
    pathStyle: false,
    endpointPlaceholder: 'cos.ap-guangzhou.myqcloud.com',
  },
  wasabi: {
    name: 'Wasabi',
    endpoint: 's3.<region>.wasabisys.com',
    regions: ['us-east-1', 'us-east-2', 'us-west-1', 'eu-central-1', 'eu-west-1', 'eu-west-2', 'ap-northeast-1', 'ap-northeast-2'],
    pathStyle: false,
    endpointPlaceholder: 's3.us-east-1.wasabisys.com',
  },
  digitalocean: {
    name: 'DigitalOcean Spaces',
    endpoint: '<region>.digitaloceanspaces.com',
    regions: ['nyc3', 'nyc1', 'sfo3', 'sfo2', 'ams3', 'sgp1', 'lon1', 'fra1', 'blr1', 'syd1'],
    pathStyle: false,
    endpointPlaceholder: 'nyc3.digitaloceanspaces.com',
  },
  volcengine: {
    name: '火山引擎 TOS',
    endpoint: 'tos-<region>.volces.com',
    regions: ['cn-beijing', 'cn-shanghai', 'cn-guangzhou', 'ap-southeast-1'],
    pathStyle: false,
    endpointPlaceholder: 'tos-cn-beijing.volces.com',
  },
  custom: {
    name: '自定义 S3 兼容',
    endpoint: '',
    regions: ['us-east-1'],
    pathStyle: false,
    endpointPlaceholder: 'your-s3-endpoint.com',
  },
};

// ── 路径风格自动检测 ──────────────────────────

/**
 * 根据 provider 和 endpoint 自动判断是否使用路径风格。
 * 规则：
 *  1. provider 明确指定 pathStyle → 直接使用
 *  2. endpoint 是 IP 地址或 localhost → path-style
 *  3. endpoint 含端口号（:xxxx） → path-style
 *  4. 其他 → virtual-hosted style
 */
export function detectPathStyle(endpoint: string, provider?: string): boolean {
  // 1. provider 预设明确指定
  if (provider && PROVIDERS[provider]?.pathStyle) {
    return true;
  }

  const host = endpoint.split('://').pop() || endpoint;

  // 2. localhost → path-style
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    return true;
  }

  // 3. IP 地址 → path-style (IPv4: 数字.数字.数字.数字)
  const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/;
  if (ipPattern.test(host)) {
    return true;
  }

  // 4. 含非标准端口号 → path-style (标准端口 80/443 不算)
  const portMatch = host.match(/:(\d+)$/);
  if (portMatch) {
    const port = parseInt(portMatch[1], 10);
    if (port !== 80 && port !== 443) {
      return true;
    }
  }

  // 5. 默认 virtual-hosted style
  return false;
}

// ── 存储后端配置解析 ──────────────────────────

export interface StorageBackend {
  name: string;
  config: StorageBackendConfig;
  credentials?: { accessKey: string; secretKey: string };
}

/**
 * 解析 STORAGE_CONFIG 环境变量，返回所有配置的后端。
 * STORAGE_CONFIG 格式（JSON 数组）：
 * [
 *   { "name": "main", "provider": "aws", "endpoint": "s3.amazonaws.com", "bucket": "my-bucket", "region": "us-east-1", "primary": true, "sync": true },
 *   { "name": "backup", "provider": "b2", "endpoint": "s3.us-west-004.backblazeb2.com", "bucket": "my-b2-bucket", "region": "us-west-004", "sync": true }
 * ]
 *
 * S3_CREDENTIALS 格式（JSON 对象）：
 * { "main": { "accessKey": "xxx", "secretKey": "yyy" }, "backup": { "accessKey": "aaa", "secretKey": "bbb" } }
 */
export function parseStorageConfig(env: Env): StorageBackend[] {
  const backends: StorageBackend[] = [];

  // 解析 STORAGE_CONFIG
  let configs: StorageBackendConfig[] = [];
  if (env.STORAGE_CONFIG) {
    try {
      configs = JSON.parse(env.STORAGE_CONFIG);
    } catch (e) {
      console.error('STORAGE_CONFIG JSON 解析失败:', e);
    }
  }

  // 解析 S3_CREDENTIALS
  let credentials: Record<string, { accessKey: string; secretKey: string }> = {};
  if (env.S3_CREDENTIALS) {
    try {
      credentials = JSON.parse(env.S3_CREDENTIALS);
    } catch (e) {
      console.error('S3_CREDENTIALS JSON 解析失败:', e);
    }
  }

  for (const cfg of configs) {
    // 自动检测路径风格
    if (cfg.pathStyle === undefined || cfg.pathStyle === null) {
      cfg.pathStyle = detectPathStyle(cfg.endpoint, cfg.provider);
    }

    backends.push({
      name: cfg.name,
      config: cfg,
      credentials: credentials[cfg.name] || undefined,
    });
  }

  return backends;
}

/**
 * 向后兼容：从旧的单 S3 环境变量构建 StorageBackend。
 * 当 STORAGE_CONFIG 不存在时使用。
 */
export function parseLegacyS3(env: Env): StorageBackend | null {
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
    return null;
  }

  const pathStyle = detectPathStyle(env.S3_ENDPOINT);

  return {
    name: 'legacy-s3',
    config: {
      name: 'legacy-s3',
      provider: 'custom',
      endpoint: env.S3_ENDPOINT,
      bucket: env.S3_BUCKET,
      region: env.S3_REGION,
      pathStyle,
      primary: false,
      sync: true,
    },
    credentials: {
      accessKey: env.S3_ACCESS_KEY,
      secretKey: env.S3_SECRET_KEY,
    },
  };
}

/**
 * 获取所有存储后端（新配置优先，回退到旧格式）。
 */
export function getAllBackends(env: Env): StorageBackend[] {
  const backends = parseStorageConfig(env);
  if (backends.length > 0) return backends;

  // 向后兼容：旧的 R2 + 单 S3
  // R2 不在此处管理（它通过 DRIVE binding 直接使用）
  const legacy = parseLegacyS3(env);
  return legacy ? [legacy] : [];
}

/**
 * 获取主存储后端配置。
 */
export function getPrimaryBackend(env: Env): StorageBackend | null {
  const backends = parseStorageConfig(env);
  return backends.find(b => b.config.primary) || backends[0] || null;
}

/**
 * 获取所有需要同步的后端（非主存储但 sync=true）。
 */
export function getSyncBackends(env: Env): StorageBackend[] {
  const backends = parseStorageConfig(env);
  const primary = backends.find(b => b.config.primary) || backends[0];
  return backends.filter(b => b !== primary && b.config.sync !== false);
}

/**
 * 将 StorageBackend 转换为 S3Config（供 s3-upload.ts 使用）。
 */
export function toS3Config(backend: StorageBackend): S3Config | null {
  if (!backend.credentials) return null;
  return {
    endpoint: backend.config.endpoint,
    bucket: backend.config.bucket,
    region: backend.config.region,
    accessKey: backend.credentials.accessKey,
    secretKey: backend.credentials.secretKey,
    pathStyle: backend.config.pathStyle,
  };
}

/**
 * 获取旧格式的 S3Config（向后兼容，供未迁移到新配置的用户使用）。
 */
export function getLegacyS3Cfg(env: Env): S3Config | null {
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_REGION || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) return null;
  return {
    endpoint: env.S3_ENDPOINT,
    bucket: env.S3_BUCKET,
    region: env.S3_REGION,
    accessKey: env.S3_ACCESS_KEY,
    secretKey: env.S3_SECRET_KEY,
    pathStyle: detectPathStyle(env.S3_ENDPOINT),
  };
}

/**
 * 获取所有 S3Config 列表（运行时配置 > 环境变量新格式 > 向后兼容旧格式）。
 * 用于上传时遍历所有后端。
 * @param env 环境变量
 * @param drive R2 Bucket binding（可选，用于读取运行时配置）
 */
export async function getAllS3ConfigsAsync(env: Env, drive?: R2Bucket): Promise<S3Config[]> {
  const configs: S3Config[] = [];

  // 1. 优先从 R2 读取运行时配置
  if (drive) {
    const runtime = await loadRuntimeConfig(drive);
    if (runtime) {
      for (const b of runtime.backends) {
        const cred = runtime.credentials[b.name];
        if (!cred) continue;
        const pathStyle = b.pathStyle !== undefined ? b.pathStyle : detectPathStyle(b.endpoint, b.provider);
        configs.push({
          endpoint: b.endpoint,
          bucket: b.bucket,
          region: b.region,
          accessKey: cred.accessKey,
          secretKey: cred.secretKey,
          pathStyle,
        });
      }
      if (configs.length > 0) return configs;
    }
  }

  // 2. 回退到环境变量新格式
  const backends = parseStorageConfig(env);
  for (const b of backends) {
    const cfg = toS3Config(b);
    if (cfg) configs.push(cfg);
  }

  // 3. 回退到旧格式
  if (configs.length === 0) {
    const legacy = getLegacyS3Cfg(env);
    if (legacy) configs.push(legacy);
  }

  return configs;
}

/**
 * 同步版本：仅从环境变量获取（不读 R2），用于不需要运行时配置的场景。
 */
export function getAllS3Configs(env: Env): S3Config[] {
  const configs: S3Config[] = [];

  const backends = parseStorageConfig(env);
  for (const b of backends) {
    const cfg = toS3Config(b);
    if (cfg) configs.push(cfg);
  }

  if (configs.length === 0) {
    const legacy = getLegacyS3Cfg(env);
    if (legacy) configs.push(legacy);
  }

  return configs;
}
