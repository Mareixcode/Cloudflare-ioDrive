// Shared upload helpers

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
export async function uniqueKey(drive: R2Bucket, path: string, filename: string): Promise<string> {
  if (!path.endsWith('/')) path += '/';
  const baseKey = path + filename;
  const exists = await drive.head(baseKey);
  if (!exists) return baseKey;

  const lastDot = filename.lastIndexOf('.');
  const name = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.slice(lastDot) : '';

  for (let i = 1; i < 1000; i++) {
    const candidate = path + name + ' (' + i + ')' + ext;
    const head = await drive.head(candidate);
    if (!head) return candidate;
  }

  // Fallback (should be extremely rare)
  return path + name + ' (' + Date.now() + ')' + ext;
}
