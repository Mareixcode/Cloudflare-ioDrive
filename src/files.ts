import { Hono } from 'hono';
import type { Env, FileMeta, FolderMeta } from './types';
import { jwtAuth } from './auth';
import { uniqueKey } from './upload-utils';

export const filesRoutes = new Hono<{ Bindings: Env }>();

// All file routes require JWT auth
filesRoutes.use('*', jwtAuth);

// List files (folder-aware with delimiter)
filesRoutes.get('/', async (c) => {
  try {
    const prefix = c.req.query('prefix') || 'uploads/';
    const listed = await c.env.DRIVE.list({ prefix, delimiter: '/' });

    // Files (non-folder objects)
    const files: FileMeta[] = listed.objects
      .filter((obj) => !obj.key.endsWith('/') && !obj.key.startsWith('_'))
      .map((obj) => ({
        key: obj.key,
        name: obj.key.replace(prefix, ''),
        size: obj.size,
        uploaded: obj.uploaded?.toISOString() || new Date().toISOString(),
        contentType: obj.httpMetadata?.contentType || 'application/octet-stream',
      }))
      .sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());

    // Folders (delimited prefixes)
    const folderMetas: FolderMeta[] = [];
    for (const dir of listed.delimitedPrefixes) {
      folderMetas.push({
        name: dir.replace(prefix, '').replace('/', ''),
        path: dir,
      });
    }

    // Current path info for breadcrumbs
    const currentPath = prefix;
    const ancestorParts = currentPath === 'uploads/' ? [] : currentPath.replace('uploads/', '').split('/').filter(Boolean);
    const ancestors: { name: string; path: string }[] = [];
    for (let i = 0; i < ancestorParts.length; i++) {
      ancestors.push({
        name: ancestorParts[i],
        path: 'uploads/' + ancestorParts.slice(0, i + 1).join('/') + '/',
      });
    }

    return c.json({ files, folders: folderMetas, currentPath, ancestors });
  } catch (err: any) {
    console.error('files list error:', err);
    return c.json({ error: 'Failed to list files: ' + (err?.message || String(err)) }, 500);
  }
});

// List all folders recursively (for move picker)
filesRoutes.get('/folders', async (c) => {
  const folders: string[] = [];
  async function collect(prefix: string, depth: number) {
    if (depth > 5) return;
    const listed = await c.env.DRIVE.list({ prefix, delimiter: '/' });
    for (const dir of listed.delimitedPrefixes) {
      folders.push(dir);
      await collect(dir, depth + 1);
    }
  }
  await collect('uploads/', 0);
  return c.json({ folders });
});

// Create folder
filesRoutes.post('/folder', async (c) => {
  const { path } = await c.req.json<{ path: string }>();
  if (!path || !path.startsWith('uploads/')) return c.json({ error: 'invalid path' }, 400);
  const folderKey = path.endsWith('/') ? path : path + '/';
  const existing = await c.env.DRIVE.head(folderKey);
  if (existing) return c.json({ error: '文件夹已存在' }, 409);
  await c.env.DRIVE.put(folderKey, new Uint8Array(0), {
    httpMetadata: { contentType: 'application/x-directory' },
  });
  return c.json({ ok: true, path: folderKey });
});

// Delete file or folder
filesRoutes.delete('/:key{.+}', async (c) => {
  const key = c.req.param('key');
  if (key.endsWith('/')) {
    const listed = await c.env.DRIVE.list({ prefix: key });
    const keys = listed.objects.map((o) => o.key);
    if (keys.length > 0) await c.env.DRIVE.delete(keys);
    if (!keys.includes(key)) await c.env.DRIVE.delete(key);
  } else {
    await c.env.DRIVE.delete(key);
  }
  return c.json({ ok: true });
});

// Batch delete (supports folders)
filesRoutes.post('/batch-delete', async (c) => {
  const { keys } = await c.req.json<{ keys: string[] }>();
  if (!keys?.length) return c.json({ error: 'no keys' }, 400);
  const expanded: string[] = [];
  for (const key of keys) {
    if (key.endsWith('/')) {
      const listed = await c.env.DRIVE.list({ prefix: key });
      expanded.push(...listed.objects.map((o) => o.key));
      if (!listed.objects.some((o) => o.key === key)) expanded.push(key);
    } else {
      expanded.push(key);
    }
  }
  const batchSize = 100;
  for (let i = 0; i < expanded.length; i += batchSize) {
    await c.env.DRIVE.delete(expanded.slice(i, i + batchSize));
  }
  return c.json({ ok: true, deleted: expanded.length });
});

// Move files to folder
filesRoutes.post('/move', async (c) => {
  const { keys, targetPath } = await c.req.json<{ keys: string[]; targetPath: string }>();
  if (!keys?.length || !targetPath) return c.json({ error: 'no keys or target' }, 400);
  for (const key of keys) {
    if (key.endsWith('/')) continue;
    const obj = await c.env.DRIVE.get(key);
    if (!obj) continue;
    const filename = key.split('/').pop() || key;
    const newKey = await uniqueKey(c.env.DRIVE, targetPath, filename);
    await c.env.DRIVE.put(newKey, await obj.arrayBuffer(), {
      httpMetadata: obj.httpMetadata,
      customMetadata: obj.customMetadata,
    });
    await c.env.DRIVE.delete(key);
  }
  return c.json({ ok: true });
});

// Get file info
filesRoutes.get('/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const obj = await c.env.DRIVE.head(key);
  if (!obj) return c.json({ error: '文件不存在' }, 404);
  return c.json({
    key,
    name: key.split('/').pop(),
    size: obj.size,
    uploaded: obj.uploaded?.toISOString(),
    contentType: obj.httpMetadata?.contentType,
  });
});
