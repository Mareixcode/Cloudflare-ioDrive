export interface Env {
  // Bindings
  DRIVE: R2Bucket;

  // Environment variables
  ADMIN_USER: string;
  ADMIN_PASS: string;       // set via wrangler secret
  JWT_SECRET: string;
  R2_PUBLIC_DOMAIN: string;
  R2_BUCKET: string;
  R2_ACCOUNT_ID: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET: string;
  R2_ACCESS_KEY: string;
  R2_SECRET_KEY: string;
  PUBLIC_UPLOAD_PATH?: string;

  // Optional S3
  S3_ENDPOINT?: string;
  S3_BUCKET?: string;
  S3_REGION?: string;
  S3_ACCESS_KEY?: string;   // set via wrangler secret
  S3_SECRET_KEY?: string;   // set via wrangler secret
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
  source: 'dashboard' | 'public' | 'upload-key';
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
