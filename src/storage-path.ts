const MAX_FILENAME_LENGTH = 255;

function assertSafeSegment(segment: string): void {
  if (!segment || segment === '.' || segment === '..') {
    throw new Error('路径包含非法目录');
  }
  if (segment.includes('\0') || segment.includes('\\')) {
    throw new Error('路径包含非法字符');
  }
}

/**
 * Validate and normalize a storage directory. Empty root paths are allowed for
 * explicitly selected S3 backends; internal metadata namespaces are not.
 */
export function normalizeStorageDirectory(path: string): string {
  const value = path.trim();
  if (!value) return '';
  if (value.startsWith('/') || value.startsWith('_')) {
    throw new Error('不允许访问内部或绝对路径');
  }

  const segments = value.split('/').filter(Boolean);
  for (const segment of segments) assertSafeSegment(segment);
  return segments.join('/') + '/';
}

export function normalizeUploadDirectory(path: string): string {
  const normalized = normalizeStorageDirectory(path);
  if (!normalized.startsWith('uploads/')) {
    throw new Error('上传目录必须位于 uploads/ 下');
  }
  return normalized;
}

export function assertSafeFilename(filename: string): void {
  if (!filename || filename.length > MAX_FILENAME_LENGTH) {
    throw new Error('文件名为空或过长');
  }
  if (filename === '.' || filename === '..' || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
    throw new Error('文件名包含非法字符');
  }
}

export function assertSafeStorageKey(key: string): void {
  if (!key || key.startsWith('/') || key.startsWith('_')) {
    throw new Error('不允许操作内部或绝对路径');
  }
  const segments = key.split('/').filter(Boolean);
  for (const segment of segments) assertSafeSegment(segment);
}
