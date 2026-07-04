import type { Env } from './types';

/**
 * 获取文件 Key 对应的父级目录前缀（带有斜杠结束）
 */
export function getParentPrefix(key: string): string {
  if (key.endsWith('/')) {
    // 它是目录，例如 "uploads/foo/bar/"
    const parts = key.slice(0, -1).split('/');
    parts.pop();
    if (parts.length === 0) return 'uploads/';
    return parts.join('/') + '/';
  } else {
    // 它是文件，例如 "uploads/foo/bar.txt"
    const parts = key.split('/');
    parts.pop();
    if (parts.length === 0) return 'uploads/';
    return parts.join('/') + '/';
  }
}

/**
 * 获取 KV 缓存中的目录结构
 */
export async function getFileCache(env: Env, backend: string, prefix: string): Promise<any | null> {
  if (!env.CACHE_KV) return null;
  try {
    const cacheKey = `file_index:${backend}:${prefix}`;
    const value = await env.CACHE_KV.get(cacheKey);
    if (!value) return null;
    return JSON.parse(value);
  } catch (err) {
    console.error('Failed to read file list cache:', err);
    return null;
  }
}

/**
 * 写入 KV 缓存（默认缓存 10 分钟）
 */
export async function setFileCache(env: Env, backend: string, prefix: string, data: any): Promise<void> {
  if (!env.CACHE_KV) return;
  try {
    const cacheKey = `file_index:${backend}:${prefix}`;
    await env.CACHE_KV.put(cacheKey, JSON.stringify(data), {
      expirationTtl: 600, // 10 分钟配置
    });
  } catch (err) {
    console.error('Failed to write file list cache:', err);
  }
}

/**
 * 获取文件夹列表缓存
 */
export async function getFoldersCache(env: Env, backend: string): Promise<string[] | null> {
  if (!env.CACHE_KV) return null;
  try {
    const cacheKey = `folders_list:${backend}`;
    const value = await env.CACHE_KV.get(cacheKey);
    if (!value) return null;
    return JSON.parse(value);
  } catch (err) {
    console.error('Failed to read folders list cache:', err);
    return null;
  }
}

/**
 * 写入文件夹列表缓存
 */
export async function setFoldersCache(env: Env, backend: string, folders: string[]): Promise<void> {
  if (!env.CACHE_KV) return;
  try {
    const cacheKey = `folders_list:${backend}`;
    await env.CACHE_KV.put(cacheKey, JSON.stringify(folders), {
      expirationTtl: 600,
    });
  } catch (err) {
    console.error('Failed to write folders list cache:', err);
  }
}

/**
 * 清除单个文件或目录变更对应的 KV 缓存
 */
export async function clearFileCache(env: Env, backend: string, key: string): Promise<void> {
  if (!env.CACHE_KV) return;
  try {
    const parent = getParentPrefix(key);
    const cacheKey = `file_index:${backend}:${parent}`;
    const foldersKey = `folders_list:${backend}`;
    
    const promises = [
      env.CACHE_KV.delete(cacheKey),
      env.CACHE_KV.delete(foldersKey)
    ];

    if (key.endsWith('/')) {
      promises.push(env.CACHE_KV.delete(`file_index:${backend}:${key}`));
    }

    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to clear file cache:', err);
  }
}

/**
 * 批量清除多个文件变动所影响的 KV 缓存
 */
export async function clearFileCacheBatch(env: Env, backend: string, keys: string[]): Promise<void> {
  if (!env.CACHE_KV) return;
  try {
    const parents = new Set<string>();
    const specificKeys = new Set<string>();

    for (const key of keys) {
      parents.add(getParentPrefix(key));
      if (key.endsWith('/')) {
        specificKeys.add(key);
      }
    }

    const promises: Promise<void>[] = [];
    for (const parent of parents) {
      promises.push(env.CACHE_KV.delete(`file_index:${backend}:${parent}`));
    }
    for (const specificKey of specificKeys) {
      promises.push(env.CACHE_KV.delete(`file_index:${backend}:${specificKey}`));
    }

    promises.push(env.CACHE_KV.delete(`folders_list:${backend}`));

    await Promise.all(promises);
  } catch (err) {
    console.error('Failed to clear file cache batch:', err);
  }
}
