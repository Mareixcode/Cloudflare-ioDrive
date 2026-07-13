export interface Env {
  // D1 元数据库（必需）
  META_DB: D1Database;

  // KV 缓存命名空间（可选，用于文件索引缓存）
  CACHE_KV?: KVNamespace;

  // Cloudflare Workers 速率限制服务绑定（可选）
  RATE_LIMITER?: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };

  // Environment variables
  ADMIN_USER: string;
  ADMIN_PASS: string;       // set via wrangler secret
  JWT_SECRET: string;
  PUBLIC_DOMAIN?: string;    // 公开访问域名（可选，用于图床/内容审核等公开 URL 生成）
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET: string;
  PUBLIC_UPLOAD_PATH?: string;

  // Legacy single S3 (向后兼容)
  S3_ENDPOINT?: string;
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY?: string;   // set via wrangler secret
  S3_SECRET_KEY?: string;   // set via wrangler secret

  // New: multi-backend storage config
  STORAGE_CONFIG?: string;   // JSON 数组: StorageBackendConfig[]
  S3_CREDENTIALS?: string;   // JSON 对象: { "name": { accessKey, secretKey } }

  // WebDAV（可选）
  WEBDAV_ENABLED?: string;   // 'true' 启用
  WEBDAV_USER?: string;
  WEBDAV_PASS?: string;

  // 随机图片 API（可选）
  RANDOM_ENABLED?: string;        // 'true' 启用
  RANDOM_ALLOWED_DIRS?: string;   // CSV，留空 = 允许 uploads/ 下所有目录

  // 站点标识（用于 KV 缓存隔离，替代原 R2_BUCKET）
  SITE_ID?: string;
}

// 多后端存储配置
export interface StorageBackendConfig {
  name: string;       // 用户定义的唯一名称
  provider: string;   // aws|r2|b2|minio|alibaba|tencent|wasabi|digitalocean|volcengine|custom
  endpoint: string;   // S3 兼容端点
  bucket: string;     // 存储桶名称
  region: string;     // 区域
  pathStyle?: boolean; // 路径风格，不填则自动检测
  primary?: boolean;   // 是否为主存储
  sync?: boolean;      // 上传时是否同步写入
}

export interface JwtPayload {
  sub: string;   // "admin"
  role: string;  // "admin"
  iat: number;
  exp: number;
  [key: string]: unknown;
}

export interface FileMeta {
  key: string;
  name: string;
  size: number;
  uploaded: string;  // ISO date
  contentType: string;
}

export interface ShareRecord {
  token: string;
  key: string;
  name: string;
  created: string;
  expires?: string;
  noAd: boolean;
  downloads: number;
}

export interface UploadPart {
  partNumber: number;
  etag: string;
}

export interface DownloadLogEntry {
  time: string;
  key: string;
  name: string;
  size: number;
  ip: string;
  country: string;
  ua: string;
  shareToken: string;
  source: string;
  referer?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
  completed?: boolean;
}

export interface UploadLogEntry {
  time: string;
  key: string;
  name: string;
  size: number;
  ip: string;
  country: string;
  ua: string;
  source: 'dashboard' | 'public' | 'upload-key' | 'picgo';
  uploadKeyId?: string;
  uploadKeyLabel?: string;
  referer?: string;
  browser?: string;
  os?: string;
  deviceType?: string;
}

export interface FolderMeta {
  name: string;
  path: string;
}

export interface UploadKey {
  id: string;
  label: string;
  path: string;
  created: string;
  expires: string;
  usedCount: number;
  active: boolean;
}

export interface ModerationConfig {
  enabled: boolean;
  provider: 'moderatecontent' | 'nsfwjs' | 'none';
  apiKey?: string;
  apiPath?: string;
  thresholds?: {
    adult?: number;   // default 0.9
    racy?: number;    // default 0.7
  };
  fileTypes: string[];  // 默认 ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  maxSize: number;       // 默认 20 * 1024 * 1024 (20MB)
  updatedAt?: string;
}

export interface ModerationLogEntry {
  time: string;
  key: string;
  name: string;
  size: number;
  contentType: string;
  ip: string;
  ua: string;
  provider: string;
  label: 'safe' | 'racy' | 'adult';
  scores: Record<string, number>;
  reason: 'adult' | 'racy' | 'threshold' | 'safe';
  action: 'kept' | 'deleted';
  source: 'dashboard' | 'public' | 'upload-key' | 'webdav' | 'picgo';
}
