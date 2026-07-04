// S3 upload utilities — header-based AWS Signature V4 for PUT operations
import { amzDate, sha256Hex, hmacHex, getSigningKey } from './s3-sign';

export interface S3Config {
  endpoint: string;
  bucket: string;
  region: string;
  accessKey: string;
  secretKey: string;
  pathStyle?: boolean;  // true: endpoint/bucket/key, false: bucket.endpoint/key (默认)
}

// ── URL 构造辅助 ─────────────────────────────

/** 根据 pathStyle 构造请求 URL */
function buildS3Url(cfg: S3Config, key: string): { host: string; url: string; path: string } {
  const encoded = '/' + encodeURIComponent(key).replace(/%2F/g, '/');
  if (cfg.pathStyle) {
    // path-style: https://endpoint/bucket/key
    const host = cfg.endpoint;
    const path = '/' + cfg.bucket + encoded;
    return { host, url: `https://${host}${path}`, path };
  } else {
    // virtual-hosted: https://bucket.endpoint/key
    const host = `${cfg.bucket}.${cfg.endpoint}`;
    return { host, url: `https://${host}${encoded}`, path: encoded };
  }
}

// ── Single file upload ────────────────────

export async function s3PutObject(
  cfg: S3Config,
  key: string,
  body: ReadableStream | ArrayBuffer | Uint8Array | string,
  contentType: string,
): Promise<boolean> {
  const { host, url, path } = buildS3Url(cfg, key);
  const headers: Record<string, string> = {
    'Host': host,
    'Content-Type': contentType,
    'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    'x-amz-date': amzDate(),
  };

  const authHeader = await signRequest(cfg, 'PUT', path, headers, 'UNSIGNED-PAYLOAD');
  headers['Authorization'] = authHeader;

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error(`S3 PUT failed: ${res.status} ${res.statusText} - ${errText}`);
    return false;
  }
  return true;
}

// ── Multipart upload ──────────────────────

export async function s3CreateMultipart(
  cfg: S3Config,
  key: string,
  contentType: string,
): Promise<string | null> {
  const { host, url, path } = buildS3Url(cfg, key);
  const qs = 'uploads';
  const fullPath = path + '?' + qs;
  const fullUrl = url + '?uploads';
  const headers: Record<string, string> = {
    'Host': host,
    'Content-Type': contentType,
    'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    'x-amz-date': amzDate(),
  };

  headers['Authorization'] = await signRequest(cfg, 'POST', fullPath, headers, 'UNSIGNED-PAYLOAD');

  const res = await fetch(fullUrl, { method: 'POST', headers });
  if (!res.ok) return null;

  const xml = await res.text();
  const match = xml.match(/<UploadId>(.+?)<\/UploadId>/);
  return match ? match[1] : null;
}

export async function s3UploadPart(
  cfg: S3Config,
  key: string,
  uploadId: string,
  partNumber: number,
  body: ReadableStream | ArrayBuffer | Uint8Array,
): Promise<string | null> {
  const { host, url, path } = buildS3Url(cfg, key);
  const qs = `partNumber=${partNumber}&uploadId=${encodeURIComponent(uploadId)}`;
  const fullPath = path + '?' + qs;
  const fullUrl = url + '?' + qs;
  const headers: Record<string, string> = {
    'Host': host,
    'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    'x-amz-date': amzDate(),
  };

  headers['Authorization'] = await signRequest(cfg, 'PUT', fullPath, headers, 'UNSIGNED-PAYLOAD');

  const res = await fetch(fullUrl, { method: 'PUT', headers, body });
  if (!res.ok) return null;

  return res.headers.get('etag');
}

export async function s3CompleteMultipart(
  cfg: S3Config,
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[],
): Promise<boolean> {
  const { host, url, path } = buildS3Url(cfg, key);
  const qs = `uploadId=${encodeURIComponent(uploadId)}`;
  const fullPath = path + '?' + qs;
  const fullUrl = url + '?' + qs;

  const xmlParts = parts
    .sort((a, b) => a.partNumber - b.partNumber)
    .map(p => `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${p.etag}</ETag></Part>`)
    .join('');

  const body = `<CompleteMultipartUpload>${xmlParts}</CompleteMultipartUpload>`;

  const headers: Record<string, string> = {
    'Host': host,
    'Content-Type': 'application/xml',
    'x-amz-content-sha256': await sha256Hex(body),
    'x-amz-date': amzDate(),
  };

  headers['Authorization'] = await signRequest(cfg, 'POST', fullPath, headers, headers['x-amz-content-sha256']);

  const res = await fetch(fullUrl, { method: 'POST', headers, body });
  return res.ok;
}

/** 取消 S3 多段上传，释放已上传的分片 */
export async function s3AbortMultipart(
  cfg: S3Config,
  key: string,
  uploadId: string,
): Promise<boolean> {
  const { host, url, path } = buildS3Url(cfg, key);
  const qs = `uploadId=${encodeURIComponent(uploadId)}`;
  const fullPath = path + '?' + qs;
  const fullUrl = url + '?' + qs;
  const headers: Record<string, string> = {
    'Host': host,
    'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
    'x-amz-date': amzDate(),
  };
  headers['Authorization'] = await signRequest(cfg, 'DELETE', fullPath, headers, 'UNSIGNED-PAYLOAD');
  const res = await fetch(fullUrl, { method: 'DELETE', headers });
  return res.ok;
}

// ── AWS Signature V4 (header-based) ───────

async function signRequest(
  cfg: S3Config,
  method: string,
  path: string,
  headers: Record<string, string>,
  payloadHash: string,
): Promise<string> {
  const now = headers['x-amz-date'] || amzDate();
  const dateStamp = now.slice(0, 8);
  const credentialScope = `${dateStamp}/${cfg.region}/s3/aws4_request`;

  // Filter and sort signed header names (lowercase)
  const signedHeaderNames = Object.keys(headers)
    .map(k => k.toLowerCase())
    .filter(k => k === 'host' || k.startsWith('x-amz-') || k === 'content-type')
    .sort();

  const signedHeaders = signedHeaderNames.join(';');

  // Build canonical headers (lowercase name:value pairs, sorted)
  const headerMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    headerMap[k.toLowerCase()] = v.trim();
  }
  const canonicalHeaders = signedHeaderNames.map(k => `${k}:${headerMap[k]}`).join('\n') + '\n';

  // Parse query string from path
  const [canonicalUri, rawQuery] = path.split('?');
  const canonicalQS = rawQuery
    ? rawQuery.split('&').sort().join('&')
    : '';

  const canonicalRequest = [
    method, canonicalUri, canonicalQS,
    canonicalHeaders, signedHeaders, payloadHash,
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256', now, credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = await getSigningKey(cfg.secretKey, dateStamp, cfg.region, 's3');
  const signature = await hmacHex(signingKey, stringToSign);

  return `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}


