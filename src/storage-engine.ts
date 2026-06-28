// 存储引擎抽象层 — 统一 R2 / S3 操作接口
// R2 可选：当 DRIVE binding 存在时优先使用 R2，否则回退到主 S3 后端
import type { Env, StorageBackendConfig } from './types';
import type { S3Config } from './s3-upload';
import { s3PutObject, s3CreateMultipart, s3UploadPart, s3CompleteMultipart } from './s3-upload';
import { getAllS3ConfigsAsync, detectPathStyle } from './storage';

// ── 列表结果类型 ─────────────────────────────

export interface ListResult {
  objects: { key: string; size: number; uploaded?: string; contentType?: string }[];
  delimitedPrefixes: string[];
  truncated: boolean;
  cursor?: string;
}

export interface ListOptions {
  delimiter?: string;
  limit?: number;
  cursor?: string;
}

export interface HeadResult {
  key: string;
  size: number;
  contentType?: string;
  uploaded?: string;
}

export interface MultipartUpload {
  uploadId: string;
  key: string;
  uploadPart(partNumber: number, data: ArrayBuffer): Promise<{ partNumber: number; etag: string }>;
  complete(parts: { partNumber: number; etag: string }[]): Promise<{ key: string; size: number }>;
  abort(): Promise<void>;
}

// ── 存储引擎接口 ─────────────────────────────

export interface StorageEngine {
  list(prefix: string, options?: ListOptions): Promise<ListResult>;
  get(key: string): Promise<{ text(): Promise<string>; arrayBuffer(): Promise<ArrayBuffer> } | null>;
  head(key: string): Promise<HeadResult | null>;
  put(key: string, data: ArrayBuffer | string, options?: { contentType?: string; customMetadata?: Record<string, string> }): Promise<void>;
  delete(key: string | string[]): Promise<void>;
  createMultipartUpload(key: string, options?: { contentType?: string }): Promise<MultipartUpload>;
}

// ── R2 存储引擎 ──────────────────────────────

class R2StorageEngine implements StorageEngine {
  constructor(private bucket: R2Bucket) {}

  async list(prefix: string, options?: ListOptions): Promise<ListResult> {
    const listed = await this.bucket.list({
      prefix,
      delimiter: options?.delimiter,
      limit: options?.limit,
      cursor: options?.cursor,
    });
    return {
      objects: listed.objects.map(obj => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded?.toISOString(),
        contentType: obj.httpMetadata?.contentType,
      })),
      delimitedPrefixes: listed.delimitedPrefixes,
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : undefined,
    };
  }

  async get(key: string) {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    return {
      text: () => obj.text(),
      arrayBuffer: () => obj.arrayBuffer(),
    };
  }

  async head(key: string): Promise<HeadResult | null> {
    const obj = await this.bucket.head(key);
    if (!obj) return null;
    return {
      key: obj.key,
      size: obj.size,
      contentType: obj.httpMetadata?.contentType,
      uploaded: obj.uploaded?.toISOString(),
    };
  }

  async put(key: string, data: ArrayBuffer | string, options?: { contentType?: string; customMetadata?: Record<string, string> }) {
    await this.bucket.put(key, data, {
      httpMetadata: options?.contentType ? { contentType: options.contentType } : undefined,
      customMetadata: options?.customMetadata,
    });
  }

  async delete(key: string | string[]) {
    if (Array.isArray(key)) {
      if (key.length > 0) await this.bucket.delete(key);
    } else {
      await this.bucket.delete(key);
    }
  }

  async createMultipartUpload(key: string, options?: { contentType?: string }): Promise<MultipartUpload> {
    const mp = await this.bucket.createMultipartUpload(key, {
      httpMetadata: options?.contentType ? { contentType: options.contentType } : undefined,
    });
    return {
      uploadId: mp.uploadId,
      key,
      uploadPart: (partNumber: number, data: ArrayBuffer) => mp.uploadPart(partNumber, data),
      complete: async (parts) => {
        const obj = await mp.complete(parts);
        return { key: obj.key, size: obj.size };
      },
      abort: () => mp.abort(),
    };
  }
}

// ── S3 存储引擎 ──────────────────────────────

class S3StorageEngine implements StorageEngine {
  constructor(private cfg: S3Config) {}

  private buildUrl(key: string): { host: string; url: string; path: string } {
    const encoded = '/' + encodeURIComponent(key).replace(/%2F/g, '/');
    if (this.cfg.pathStyle) {
      const host = this.cfg.endpoint;
      const path = '/' + this.cfg.bucket + encoded;
      return { host, url: `https://${host}${path}`, path };
    } else {
      const host = `${this.bucket}.${this.cfg.endpoint}`;
      return { host, url: `https://${host}${encoded}`, path: encoded };
    }
  }

  private get bucket() { return this.cfg.bucket; }

  private async sign(method: string, path: string, headers: Record<string, string>, payloadHash: string): Promise<string> {
    const now = headers['x-amz-date'] || this.amzDate();
    const dateStamp = now.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.cfg.region}/s3/aws4_request`;

    const signedHeaderNames = Object.keys(headers)
      .map(k => k.toLowerCase())
      .filter(k => k === 'host' || k.startsWith('x-amz-') || k === 'content-type')
      .sort();

    const signedHeaders = signedHeaderNames.join(';');
    const headerMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(headers)) headerMap[k.toLowerCase()] = v.trim();
    const canonicalHeaders = signedHeaderNames.map(k => `${k}:${headerMap[k]}`).join('\n') + '\n';

    const [canonicalUri, rawQuery] = path.split('?');
    const canonicalQS = rawQuery ? rawQuery.split('&').sort().join('&') : '';

    const canonicalRequest = [method, canonicalUri, canonicalQS, canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const stringToSign = ['AWS4-HMAC-SHA256', now, credentialScope, await this.sha256Hex(canonicalRequest)].join('\n');
    const signingKey = await this.getSigningKey(this.cfg.secretKey, dateStamp, this.cfg.region, 's3');
    const signature = await this.hmacHex(signingKey, stringToSign);

    return `AWS4-HMAC-SHA256 Credential=${this.cfg.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  }

  private amzDate(): string {
    return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '') + 'Z';
  }

  private async sha256Hex(data: string): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async hmacBytes(key: CryptoKey | Uint8Array, data: string): Promise<Uint8Array> {
    const k = key instanceof Uint8Array
      ? await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
      : key;
    return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
  }

  private async hmacHex(key: CryptoKey | Uint8Array, data: string): Promise<string> {
    return [...await this.hmacBytes(key, data)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async getSigningKey(secret: string, date: string, region: string, service: string): Promise<Uint8Array> {
    const enc = new TextEncoder();
    const kSecret = await crypto.subtle.importKey('raw', enc.encode('AWS4' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const kDate = await this.hmacBytes(kSecret, date);
    const kDateKey = await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const kRegion = await this.hmacBytes(kDateKey, region);
    const kRegionKey = await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const kService = await this.hmacBytes(kRegionKey, service);
    const kServiceKey = await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return await this.hmacBytes(kServiceKey, 'aws4_request');
  }

  async list(prefix: string, options?: ListOptions): Promise<ListResult> {
    const host = this.cfg.pathStyle ? this.cfg.endpoint : `${this.bucket}.${this.cfg.endpoint}`;
    const bucketPath = this.cfg.pathStyle ? `/${this.bucket}` : '';
    const params = new URLSearchParams({
      'list-type': '2',
      prefix,
      'max-keys': String(options?.limit || 1000),
    });
    if (options?.delimiter) params.set('delimiter', options.delimiter);
    if (options?.cursor) params.set('continuation-token', options.cursor);

    const path = bucketPath + '?' + params.toString();
    const headers: Record<string, string> = {
      'Host': host,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'x-amz-date': this.amzDate(),
    };
    headers['Authorization'] = await this.sign('GET', path, headers, 'UNSIGNED-PAYLOAD');

    const res = await fetch(`https://${host}${path}`, { method: 'GET', headers });
    if (!res.ok) {
      console.error(`S3 ListObjects failed: ${res.status} ${res.statusText} (${prefix})`);
      return { objects: [], delimitedPrefixes: [], truncated: false };
    }

    const xml = await res.text();
    const objects: ListResult['objects'] = [];

    // 简单 XML 解析
    const contents = xml.split('<Contents>').slice(1);
    for (const c of contents) {
      const key = this.xmlValue(c, 'Key');
      const size = parseInt(this.xmlValue(c, 'Size') || '0', 10);
      const lastModified = this.xmlValue(c, 'LastModified');
      if (key && !key.endsWith('/')) {
        objects.push({ key, size, uploaded: lastModified });
      }
    }

    const prefixes: string[] = [];
    const cpfx = xml.split('<CommonPrefixes>').slice(1);
    for (const p of cpfx) {
      const pfx = this.xmlValue(p, 'Prefix');
      if (pfx) prefixes.push(pfx);
    }

    const isTruncated = xml.includes('<IsTruncated>true</IsTruncated>');
    const nextToken = this.xmlValue(xml, 'NextContinuationToken');

    return {
      objects,
      delimitedPrefixes: prefixes,
      truncated: isTruncated,
      cursor: isTruncated ? nextToken : undefined,
    };
  }

  async get(key: string) {
    const { host, url, path } = this.buildUrl(key);
    const headers: Record<string, string> = {
      'Host': host,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'x-amz-date': this.amzDate(),
    };
    headers['Authorization'] = await this.sign('GET', path, headers, 'UNSIGNED-PAYLOAD');

    const res = await fetch(url, { method: 'GET', headers });
    if (!res.ok) return null;

    const buf = await res.arrayBuffer();
    return {
      text: () => Promise.resolve(new TextDecoder().decode(buf)),
      arrayBuffer: () => Promise.resolve(buf),
    };
  }

  async head(key: string): Promise<HeadResult | null> {
    const { host, url, path } = this.buildUrl(key);
    const headers: Record<string, string> = {
      'Host': host,
      'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
      'x-amz-date': this.amzDate(),
    };
    headers['Authorization'] = await this.sign('HEAD', path, headers, 'UNSIGNED-PAYLOAD');

    const res = await fetch(url, { method: 'HEAD', headers });
    if (!res.ok) return null;

    return {
      key,
      size: parseInt(res.headers.get('content-length') || '0', 10),
      contentType: res.headers.get('content-type') || undefined,
      uploaded: res.headers.get('last-modified') || undefined,
    };
  }

  async put(key: string, data: ArrayBuffer | string, options?: { contentType?: string }) {
    const body = typeof data === 'string' ? new TextEncoder().encode(data) : data;
    await s3PutObject(this.cfg, key, body, options?.contentType || 'application/octet-stream');
  }

  async delete(key: string | string[]) {
    const keys = Array.isArray(key) ? key : [key];
    for (const k of keys) {
      const { host, url, path } = this.buildUrl(k);
      const headers: Record<string, string> = {
        'Host': host,
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
        'x-amz-date': this.amzDate(),
      };
      headers['Authorization'] = await this.sign('DELETE', path, headers, 'UNSIGNED-PAYLOAD');
      await fetch(url, { method: 'DELETE', headers }).catch(() => {});
    }
  }

  async createMultipartUpload(key: string, options?: { contentType?: string }): Promise<MultipartUpload> {
    const cfg = this.cfg;
    const contentType = options?.contentType || 'application/octet-stream';
    const uploadId = await s3CreateMultipart(cfg, key, contentType);
    if (!uploadId) throw new Error('S3 CreateMultipartUpload failed');

    const parts: { partNumber: number; etag: string }[] = [];
    const self = this;

    return {
      uploadId,
      key,
      async uploadPart(partNumber: number, data: ArrayBuffer) {
        const etag = await s3UploadPart(cfg, key, uploadId, partNumber, data);
        if (!etag) throw new Error(`S3 uploadPart ${partNumber} failed`);
        const p = { partNumber, etag };
        parts.push(p);
        return p;
      },
      async complete(completeParts: { partNumber: number; etag: string }[]) {
        await s3CompleteMultipart(cfg, key, uploadId, completeParts);
        // 获取完成后的对象大小
        let size = 0;
        try {
          const head = await self.head(key);
          if (head) size = head.size;
        } catch {}
        return { key, size };
      },
      async abort() {
        // S3 AbortMultipartUpload
        const { host, url, path } = self.buildUrl(key);
        const qs = `uploadId=${encodeURIComponent(uploadId)}`;
        const fullPath = path + '?' + qs;
        const fullUrl = url + '?' + qs;
        const headers: Record<string, string> = {
          'Host': host,
          'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
          'x-amz-date': self.amzDate(),
        };
        headers['Authorization'] = await self.sign('DELETE', fullPath, headers, 'UNSIGNED-PAYLOAD');
        await fetch(fullUrl, { method: 'DELETE', headers }).catch(() => {});
      },
    };
  }

  private xmlValue(xml: string, tag: string): string | undefined {
    const match = xml.match(new RegExp(`<${tag}>(.+?)</${tag}>`));
    if (!match) return undefined;
    return match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
}

// ── 工厂函数 ─────────────────────────────────

/**
 * 创建存储引擎实例。
 * 优先使用 R2 binding，回退到主 S3 后端。
 */
export async function createStorageEngine(env: Env): Promise<StorageEngine> {
  // 优先使用 R2
  if (env.DRIVE) {
    return new R2StorageEngine(env.DRIVE);
  }

  // 回退到 S3
  const s3Cfgs = await getAllS3ConfigsAsync(env, env.DRIVE);
  if (s3Cfgs.length > 0) {
    return new S3StorageEngine(s3Cfgs[0]);
  }

  throw new Error('没有可用的存储后端：请配置 R2 或 S3 兼容存储');
}

/**
 * 创建 R2 引擎（仅在确认 DRIVE 存在时使用）。
 */
export function createR2Engine(drive: R2Bucket): StorageEngine {
  return new R2StorageEngine(drive);
}

/**
 * 创建 S3 引擎。
 */
export function createS3Engine(cfg: S3Config): StorageEngine {
  return new S3StorageEngine(cfg);
}
