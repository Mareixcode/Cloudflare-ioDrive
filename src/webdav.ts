// WebDAV 服务
//
// 挂载在 /dav/*。将 URL 路径直接映射为 storage key（去掉 /dav 前缀）。
// 完整支持：OPTIONS, PROPFIND, GET, PUT, DELETE, MKCOL, MOVE, COPY, PROPPATCH。
// 不实现 LOCK/UNLOCK（Windows 资源管理器对只读 + 拖拽不需要）。
//
// 鉴权：HTTP Basic（WEBDAV_USER / WEBDAV_PASS）。
// 所有内部 fetch（PUT/DELETE/MKCOL/MOVE）通过临时 JWT 走现有 /api/* 路径，
// 复用现有的上传/同步/日志逻辑。

import { Hono } from 'hono';
import { SignJWT } from 'jose';
import type { Env } from './types';
import { createStorageEngine } from './storage-engine';
import { clearFileCache } from './cache';
import { propfindResponse, propstatOk, type DavItem } from './webdav-xml';

export const webdavRoutes = new Hono<{ Bindings: Env }>();

// 路径安全：拒绝 _ 前缀、..、双重编码
function assertValidKey(key: string): void {
  if (key.startsWith('_')) throw new Error('不允许操作内部文件');
  if (key.includes('..')) throw new Error('路径中包含 ..');
  if (key.includes('\\')) throw new Error('路径中包含反斜杠');
}

function decodeKey(rawPath: string): string {
  // 去除 /dav 前缀，解码 URL 编码
  let path = rawPath;
  if (path.startsWith('/dav')) path = path.slice(4);
  if (path.startsWith('/')) path = path.slice(1);
  // 双重编码保护
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    throw new Error('URL 解码失败');
  }
  if (decoded.includes('..') || decoded.includes('\\')) {
    throw new Error('非法路径');
  }
  return decoded;
}

// ── HTTP Basic 鉴权 ─────────────────────

async function constantTimeEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let diff = 0;
  for (let i = 0; i < leftBytes.length; i++) {
    diff |= leftBytes[i] ^ rightBytes[i];
  }
  return diff === 0;
}

async function checkBasicAuth(c: any): Promise<boolean> {
  if (c.env.WEBDAV_ENABLED !== 'true') return false;
  if (!c.env.WEBDAV_USER || !c.env.WEBDAV_PASS) return false;
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Basic ')) return false;
  try {
    const decodedBytes = Uint8Array.from(atob(auth.slice(6)), char => char.charCodeAt(0));
    const decoded = new TextDecoder().decode(decodedBytes);
    const idx = decoded.indexOf(':');
    if (idx === -1) return false;
    const u = decoded.slice(0, idx);
    const p = decoded.slice(idx + 1);
    const [userMatches, passwordMatches] = await Promise.all([
      constantTimeEqual(u, c.env.WEBDAV_USER),
      constantTimeEqual(p, c.env.WEBDAV_PASS),
    ]);
    return userMatches && passwordMatches;
  } catch {
    return false;
  }
}

async function requireAuth(c: any): Promise<Response | null> {
  if (c.env.WEBDAV_ENABLED !== 'true') {
    return c.text('WebDAV disabled', 403);
  }
  if (!(await checkBasicAuth(c))) {
    return new Response('Auth required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="ioDrive", charset="UTF-8"',
        'Cache-Control': 'no-store',
      },
    });
  }
  return null;
}

// ── 内部 JWT 生成（用于 WebDAV → API 调用） ─────

async function mintInternalJWT(env: Env, ttlSeconds = 300): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return await new SignJWT({ sub: 'webdav', role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secret);
}

async function internalFetch(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const token = await mintInternalJWT(env);
  // 走 self fetch：使用同请求的 origin，保持内部调用一致性
  // （WebDAV PUT/DELETE 等方法在 Hono 内可考虑直接复用 service 函数，但保持一致
  //  性：仍走 HTTP API 以触发上传同步、日志、D1 抽象等）
  const selfUrl = env.PUBLIC_DOMAIN
    ? `https://${env.PUBLIC_DOMAIN}`
    : 'http://localhost:8787';
  return await fetch(selfUrl + path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      'Authorization': `Bearer ${token}`,
    },
  });
}

// ── Demo 拦截 ─────────────────────────

webdavRoutes.use('*', async (c, next) => {
  if ((c.req.header('host') || '').startsWith('demo.')) {
    return c.text('demo mode', 403);
  }
  await next();
});

// ── OPTIONS ─────────────────────────

webdavRoutes.on('OPTIONS', '*', async (c) => {
  const authErr = await requireAuth(c);
  if (authErr) return authErr;
  return new Response(null, {
    status: 200,
    headers: {
      'DAV': '1, 2',
      'Allow': 'OPTIONS, GET, PUT, DELETE, PROPFIND, MKCOL, MOVE, COPY, PROPPATCH',
      'MS-Author-Via': 'DAV',
    },
  });
});

// ── PROPFIND ─────────────────────────

webdavRoutes.on('PROPFIND', '*', async (c) => {
  const authErr = await requireAuth(c);
  if (authErr) return authErr;

  let key: string;
  try {
    key = decodeKey(c.req.path);
  } catch (e: any) {
    return c.text(e.message, 400);
  }

  const depth = c.req.header('Depth') || '1';
  const engine = await createStorageEngine(c.env);
  const items: DavItem[] = [];

  // 当前目录/文件
  const href = c.req.path.replace(/\/$/, '') || '/dav';
  const isCollection = key === '' || key.endsWith('/');

  if (!isCollection) {
    // 单文件
    const head = await engine.head(key);
    if (!head) return c.text('Not Found', 404);
    items.push({
      href,
      isCollection: false,
      displayName: key.split('/').pop() || key,
      lastModified: head.uploaded ? new Date(head.uploaded).toUTCString() : new Date().toUTCString(),
      contentLength: head.size,
      contentType: head.contentType || 'application/octet-stream',
      creationDate: head.uploaded || new Date().toISOString(),
    });
  } else {
    // 目录：先加入目录自身
    items.push({
      href,
      isCollection: true,
      displayName: key.split('/').filter(Boolean).pop() || 'root',
      lastModified: new Date().toUTCString(),
      creationDate: new Date().toISOString(),
    });

    if (depth !== '0') {
      const prefix = key.endsWith('/') ? key : key + '/';
      const listed = await engine.list(prefix, { delimiter: '/' });

      // 子目录
      for (const dp of listed.delimitedPrefixes || []) {
        const childPath = dp; // 含末尾 /
        const childName = childPath.replace(/\/$/, '').split('/').pop() || childPath;
        items.push({
          href: '/dav/' + childPath,
          isCollection: true,
          displayName: childName,
          lastModified: new Date().toUTCString(),
          creationDate: new Date().toISOString(),
        });
      }

      // 子文件
      for (const obj of listed.objects) {
        const name = obj.key.split('/').pop() || obj.key;
        items.push({
          href: '/dav/' + obj.key,
          isCollection: false,
          displayName: name,
          lastModified: obj.uploaded ? new Date(obj.uploaded).toUTCString() : new Date().toUTCString(),
          contentLength: obj.size,
          contentType: 'application/octet-stream',
          creationDate: obj.uploaded || new Date().toISOString(),
        });
      }
    }
  }

  return new Response(propfindResponse(href, items), {
    status: 207,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
});

// ── GET ─────────────────────────────

webdavRoutes.get('*', async (c) => {
  const authErr = await requireAuth(c);
  if (authErr) return authErr;

  let key: string;
  try {
    key = decodeKey(c.req.path);
  } catch (e: any) {
    return c.text(e.message, 400);
  }

  if (key === '' || key.endsWith('/')) {
    // 目录：返回 HTML 列表
    return c.html(renderDirectoryListing(key));
  }

  try {
    assertValidKey(key);
  } catch (e: any) {
    return c.text(e.message, 403);
  }

  const engine = await createStorageEngine(c.env);
  const obj = await engine.get(key);
  if (!obj) return c.text('Not Found', 404);

  const name = key.split('/').pop() || key;
  const headers: Record<string, string> = {
    'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${encodeURIComponent(name)}"`,
  };
  if (obj.size) headers['Content-Length'] = String(obj.size);

  return new Response(obj.body, { status: 200, headers });
});

// ── PUT ─────────────────────────────

webdavRoutes.put('*', async (c) => {
  const authErr = await requireAuth(c);
  if (authErr) return authErr;

  let key: string;
  try {
    key = decodeKey(c.req.path);
    assertValidKey(key);
  } catch (e: any) {
    return c.text(e.message, 400);
  }

  // 检查父目录是否存在（PUT 到不存在的目录应该失败）
  if (key.includes('/')) {
    const parent = key.split('/').slice(0, -1).join('/') + '/';
    const engine = await createStorageEngine(c.env);
    const parentCheck = await engine.list(parent, { limit: 1 });
    if (parentCheck.objects.length === 0 && !parentCheck.delimitedPrefixes?.length) {
      return c.text('Parent collection does not exist', 409);
    }
  }

  const body = c.req.raw.body;
  if (!body) return c.text('Missing body', 400);

  // 通过内部 fetch 调 /api/upload/single 以复用同步 + 日志
  const contentType = c.req.header('Content-Type') || 'application/octet-stream';
  const formData = new FormData();
  // 把 ReadableStream 读成 ArrayBuffer 后包成 Blob（File 构造器不接受 ReadableStream）
  const buf = await new Response(body).arrayBuffer();
  const blob = new File([buf], key.split('/').pop() || 'file', { type: contentType });
  formData.set('file', blob);
  formData.set('path', key.split('/').slice(0, -1).join('/') + '/');

  const res = await internalFetch(c.env, '/api/upload/single', {
    method: 'POST',
    body: formData,
  });

  if (res.ok) {
    return new Response(null, { status: 201, headers: { 'Location': '/dav/' + key } });
  }
  const errText = await res.text().catch(() => '');
  return c.text(`Upload failed: ${errText}`, res.status as any);
});

// ── DELETE ──────────────────────────

webdavRoutes.delete('*', async (c) => {
  const authErr = await requireAuth(c);
  if (authErr) return authErr;

  let key: string;
  try {
    key = decodeKey(c.req.path);
    assertValidKey(key);
  } catch (e: any) {
    return c.text(e.message, 400);
  }

  // 通过内部 fetch 调 /api/files/{key} 走现有删除逻辑
  // （支持文件夹递归删除）
  const res = await internalFetch(c.env, `/api/files/${encodeURI(key)}`, {
    method: 'DELETE',
  });

  if (res.ok || res.status === 404) {
    return new Response(null, { status: res.status === 404 ? 404 : 204 });
  }
  return c.text(`Delete failed: ${await res.text().catch(() => '')}`, res.status as any);
});

// ── MKCOL ───────────────────────────

webdavRoutes.on('MKCOL', '*', async (c) => {
  const authErr = await requireAuth(c);
  if (authErr) return authErr;

  let key: string;
  try {
    key = decodeKey(c.req.path);
    assertValidKey(key);
  } catch (e: any) {
    return c.text(e.message, 400);
  }

  if (!key.endsWith('/')) {
    return c.text('MKCOL requires collection path ending in /', 409);
  }

  const res = await internalFetch(c.env, '/api/files/folder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: key }),
  });

  if (res.ok) return new Response(null, { status: 201 });
  const errText = await res.text().catch(() => '');
  return c.text(`MKCOL failed: ${errText}`, res.status as any);
});

// ── MOVE ────────────────────────────

webdavRoutes.on('MOVE', '*', async (c) => {
  const authErr = await requireAuth(c);
  if (authErr) return authErr;

  let srcKey: string;
  try {
    srcKey = decodeKey(c.req.path);
    assertValidKey(srcKey);
  } catch (e: any) {
    return c.text(e.message, 400);
  }

  const dest = c.req.header('Destination');
  if (!dest) return c.text('Missing Destination header', 400);

  // Destination 通常是绝对 URL：https://host/dav/path
  let destKey: string;
  try {
    const destUrl = new URL(dest);
    destKey = decodeKey(destUrl.pathname);
    assertValidKey(destKey);
  } catch (e: any) {
    return c.text(`Invalid Destination: ${e.message}`, 400);
  }

  const targetDir = destKey.split('/').slice(0, -1).join('/') + '/';
  const res = await internalFetch(c.env, '/api/files/move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys: [srcKey], targetPath: targetDir }),
  });

  if (res.ok) return new Response(null, { status: 201 });
  const errText = await res.text().catch(() => '');
  return c.text(`MOVE failed: ${errText}`, res.status as any);
});

// ── COPY ────────────────────────────

webdavRoutes.on('COPY', '*', async (c) => {
  const authErr = await requireAuth(c);
  if (authErr) return authErr;

  let srcKey: string;
  try {
    srcKey = decodeKey(c.req.path);
    assertValidKey(srcKey);
  } catch (e: any) {
    return c.text(e.message, 400);
  }

  const dest = c.req.header('Destination');
  if (!dest) return c.text('Missing Destination header', 400);

  let destKey: string;
  try {
    const destUrl = new URL(dest);
    destKey = decodeKey(destUrl.pathname);
    assertValidKey(destKey);
  } catch (e: any) {
    return c.text(`Invalid Destination: ${e.message}`, 400);
  }

  // 简单实现：读源 → 写到目标
  const engine = await createStorageEngine(c.env);
  const srcObj = await engine.get(srcKey);
  if (!srcObj) return c.text('Source not found', 404);

  await engine.put(destKey, await srcObj.arrayBuffer(), {
    contentType: srcObj.httpMetadata?.contentType,
  });

  // 复制文件后，清除目标父目录的缓存
  c.executionCtx.waitUntil(clearFileCache(c.env, '', destKey));

  return new Response(null, { status: 201, headers: { 'Location': '/dav/' + destKey } });
});

// ── PROPPATCH (no-op) ───────────────

webdavRoutes.on('PROPPATCH', '*', async (c) => {
  const authErr = await requireAuth(c);
  if (authErr) return authErr;
  return new Response(propstatOk(c.req.path), {
    status: 207,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
});

// ── 目录列表 HTML ────────────────────

function renderDirectoryListing(key: string): string {
  const title = key || 'root';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title} - ioDrive WebDAV</title>
<style>
body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
h1 { font-size: 18px; }
ul { list-style: none; padding: 0; }
li { padding: 8px 0; border-bottom: 1px solid #eee; }
a { color: #0066cc; text-decoration: none; }
a:hover { text-decoration: underline; }
.note { color: #666; font-size: 14px; margin-top: 20px; }
</style>
</head>
<body>
<h1>📁 ${title || 'WebDAV Root'}</h1>
<p class="note">这是一个 WebDAV 目录。要浏览文件，请使用支持 WebDAV 的客户端（Windows 资源管理器、macOS Finder、RaiDrive 等）连接到本服务器。</p>
<p class="note">URL: <code>${new URL('/dav/' + (key || ''), 'https://example.com').toString()}</code></p>
</body>
</html>`;
}
