import { Hono } from 'hono';
import type { Env, FileMeta, FolderMeta } from './types';
import { jwtAuth } from './auth';
import { uniqueKey } from './upload-utils';
import { createStorageEngine, createStorageEngineForBackend } from './storage-engine';
import type { StorageEngine } from './storage-engine';
import { getFileCache, setFileCache, getFoldersCache, setFoldersCache, clearFileCache, clearFileCacheBatch } from './cache';

export const filesRoutes = new Hono<{ Bindings: Env }>();

// All file routes require JWT auth
filesRoutes.use('*', jwtAuth);

// 辅助函数：根据请求参数创建对应的存储引擎
async function getEngine(env: import('./types').Env, backend?: string): Promise<StorageEngine> {
  return backend ? createStorageEngineForBackend(env, backend) : createStorageEngine(env);
}

// List files (folder-aware with delimiter)
filesRoutes.get('/', async (c) => {
  try {
    const backend = c.req.query('backend') || '';
    const prefix = c.req.query('prefix') || 'uploads/';

    // 优先从 KV 缓存获取
    const cached = await getFileCache(c.env, backend, prefix);
    if (cached) {
      return c.json(cached);
    }

    const engine = await getEngine(c.env, backend);
    const listed = await engine.list(prefix, { delimiter: '/' });

    const files: FileMeta[] = listed.objects
      .filter((obj) => !obj.key.endsWith('/') && !obj.key.startsWith('_'))
      .map((obj) => ({
        key: obj.key,
        name: obj.key.replace(prefix, ''),
        size: obj.size,
        uploaded: obj.uploaded || new Date().toISOString(),
        contentType: obj.contentType || 'application/octet-stream',
      }))
      .sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());

    const folderMetas: FolderMeta[] = [];
    for (const dir of listed.delimitedPrefixes) {
      folderMetas.push({
        name: dir.replace(prefix, '').replace('/', ''),
        path: dir,
      });
    }

    const currentPath = prefix;
    const ancestorParts = currentPath === 'uploads/' ? [] : currentPath.replace('uploads/', '').split('/').filter(Boolean);
    const ancestors: { name: string; path: string }[] = [];
    for (let i = 0; i < ancestorParts.length; i++) {
      ancestors.push({
        name: ancestorParts[i],
        path: 'uploads/' + ancestorParts.slice(0, i + 1).join('/') + '/',
      });
    }

    const result = { files, folders: folderMetas, currentPath, ancestors };
    // 异步回写缓存，不阻塞响应
    c.executionCtx.waitUntil(setFileCache(c.env, backend, prefix, result));

    return c.json(result);
  } catch (err: any) {
    console.error('files list error:', err);
    return c.json({ error: 'Failed to list files: ' + (err?.message || String(err)) }, 500);
  }
});

// List all folders recursively (for move picker)
filesRoutes.get('/folders', async (c) => {
  const backend = c.req.query('backend') || '';

  // 优先从 KV 缓存获取
  const cached = await getFoldersCache(c.env, backend);
  if (cached) {
    return c.json({ folders: cached });
  }

  const engine = await getEngine(c.env, backend);
  const folders: string[] = [];
  async function collect(prefix: string, depth: number) {
    if (depth > 5) return;
    const listed = await engine.list(prefix, { delimiter: '/' });
    for (const dir of listed.delimitedPrefixes) {
      folders.push(dir);
      await collect(dir, depth + 1);
    }
  }
  await collect('uploads/', 0);

  // 异步写入缓存
  c.executionCtx.waitUntil(setFoldersCache(c.env, backend, folders));
  return c.json({ folders });
});

// Create folder
filesRoutes.post('/folder', async (c) => {
  const backend = c.req.query('backend') || '';
  const engine = await getEngine(c.env, backend);
  const { path } = await c.req.json<{ path: string }>();
  if (!path || !path.startsWith('uploads/')) return c.json({ error: 'invalid path' }, 400);
  const folderKey = path.endsWith('/') ? path : path + '/';
  const existing = await engine.head(folderKey);
  if (existing) return c.json({ error: '文件夹已存在' }, 409);
  await engine.put(folderKey, '', { contentType: 'application/x-directory' });
  c.executionCtx.waitUntil(clearFileCache(c.env, backend, folderKey));
  return c.json({ ok: true, path: folderKey });
});

// 校验 key 不允许操作内部元数据（以 _ 开头的路径）
function assertValidKey(key: string): void {
  if (key.startsWith('_')) throw new Error('不允许操作内部文件');
}
function assertValidKeys(keys: string[]): void {
  for (const k of keys) assertValidKey(k);
}

// Delete file or folder
filesRoutes.delete('/:key{.+}', async (c) => {
  const backend = c.req.query('backend') || '';
  const engine = await getEngine(c.env, backend);
  const key = c.req.param('key');
  assertValidKey(key);
  if (key.endsWith('/')) {
    let cursor: string | undefined;
    const allKeys: string[] = [];
    do {
      const listed = await engine.list(key, { limit: 1000, cursor });
      for (const o of listed.objects) {
        allKeys.push(o.key);
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    if (allKeys.length > 0) {
      for (let i = 0; i < allKeys.length; i += 100) {
        await engine.delete(allKeys.slice(i, i + 100));
      }
    }
    if (!allKeys.includes(key)) {
      await engine.delete(key).catch(() => {});
    }
  } else {
    await engine.delete(key);
  }
  c.executionCtx.waitUntil(clearFileCache(c.env, backend, key));
  return c.json({ ok: true });
});

// Batch delete (supports folders)
filesRoutes.post('/batch-delete', async (c) => {
  const backend = c.req.query('backend') || '';
  const engine = await getEngine(c.env, backend);
  const { keys } = await c.req.json<{ keys: string[] }>();
  if (!keys?.length) return c.json({ error: 'no keys' }, 400);
  assertValidKeys(keys);
  const expanded: string[] = [];
  for (const key of keys) {
    if (key.endsWith('/')) {
      let cursor: string | undefined;
      do {
        const listed = await engine.list(key, { limit: 1000, cursor });
        for (const o of listed.objects) {
          expanded.push(o.key);
        }
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);
      if (!expanded.includes(key)) expanded.push(key);
    } else {
      expanded.push(key);
    }
  }
  const batchSize = 100;
  for (let i = 0; i < expanded.length; i += batchSize) {
    await engine.delete(expanded.slice(i, i + batchSize));
  }
  c.executionCtx.waitUntil(clearFileCacheBatch(c.env, backend, keys));
  return c.json({ ok: true, deleted: expanded.length });
});

// Move files to folder
filesRoutes.post('/move', async (c) => {
  const backend = c.req.query('backend') || '';
  const engine = await getEngine(c.env, backend);
  const { keys, targetPath } = await c.req.json<{ keys: string[]; targetPath: string }>();
  if (!keys?.length || !targetPath) return c.json({ error: 'no keys or target' }, 400);
  assertValidKeys(keys);
  for (const key of keys) {
    if (key.endsWith('/')) {
      // 移动文件夹
      const folderName = key.slice(0, -1).split('/').pop();
      if (!folderName) continue;
      const targetFolder = targetPath + folderName + '/';

      let cursor: string | undefined;
      const allObjects: string[] = [];
      do {
        const listed = await engine.list(key, { cursor });
        for (const o of listed.objects) {
          allObjects.push(o.key);
        }
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);

      for (const objKey of allObjects) {
        const relativePath = objKey.substring(key.length);
        const newKey = targetFolder + relativePath;
        const fileObj = await engine.get(objKey);
        if (!fileObj) continue;
        const head = await engine.head(objKey);
        const contentType = head?.contentType || 'application/octet-stream';
        await engine.put(newKey, await fileObj.arrayBuffer(), { contentType });
        await engine.delete(objKey);
      }

      await engine.delete(key).catch(() => {});
      await engine.put(targetFolder, '', { contentType: 'application/x-directory' }).catch(() => {});
    } else {
      const obj = await engine.get(key);
      if (!obj) continue;
      const head = await engine.head(key);
      const contentType = head?.contentType || 'application/octet-stream';
      const filename = key.split('/').pop() || key;
      const newKey = await uniqueKey(engine, targetPath, filename);
      await engine.put(newKey, await obj.arrayBuffer(), { contentType });
      await engine.delete(key);
    }
  }
  c.executionCtx.waitUntil(clearFileCacheBatch(c.env, backend, [...keys, targetPath]));
  return c.json({ ok: true });
});

// Get file info
filesRoutes.get('/:key{.+}', async (c) => {
  const backend = c.req.query('backend') || '';
  const engine = await getEngine(c.env, backend);
  const key = c.req.param('key');
  const obj = await engine.head(key);
  if (!obj) return c.json({ error: '文件不存在' }, 404);
  return c.json({
    key,
    name: key.split('/').pop(),
    size: obj.size,
    uploaded: obj.uploaded,
    contentType: obj.contentType,
  });
});
