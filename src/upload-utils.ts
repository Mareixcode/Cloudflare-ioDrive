// Shared upload helpers
import type { StorageEngine } from './storage-engine';

export function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const types: Record<string, string> = {
    pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    mp4: 'video/mp4', mkv: 'video/x-matroska', avi: 'video/x-msvideo',
    mp3: 'audio/mpeg', wav: 'audio/wav', flac: 'audio/flac',
    zip: 'application/zip', rar: 'application/vnd.rar', '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar', gz: 'application/gzip',
    doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain', html: 'text/html', css: 'text/css', js: 'application/javascript',
    json: 'application/json', xml: 'application/xml',
  };
  return types[ext] || 'application/octet-stream';
}

// Generate a unique key under path preserving the original filename.
// If the target exists, appends " (1)", " (2)" ... before extension.
// Accepts either R2Bucket (legacy) or StorageEngine.
export async function uniqueKey(
  storage: StorageEngine | R2Bucket,
  path: string,
  filename: string,
): Promise<string> {
  if (!path.endsWith('/')) path += '/';

  // 适配 R2Bucket 和 StorageEngine 两种接口
  const head = async (key: string) => {
    if ('head' in storage && typeof storage.head === 'function') {
      // StorageEngine.head returns HeadResult | null
      // R2Bucket.head returns R2Object | null
      const result = await (storage as StorageEngine).head(key);
      return result;
    }
    return null;
  };

  const baseKey = path + filename;
  const exists = await head(baseKey);
  if (!exists) return baseKey;

  const lastDot = filename.lastIndexOf('.');
  const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.slice(lastDot) : '';

  for (let i = 1; i < 1000; i++) {
    const candidate = path + name + ' (' + i + ')' + ext;
    const h = await head(candidate);
    if (!h) return candidate;
  }

  return path + name + ' (' + Date.now() + ')' + ext;
}
