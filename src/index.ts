import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types';
import { authRoutes } from './auth';
import { filesRoutes } from './files';
import { uploadRoutes } from './upload';
import { shareRoutes, sharePublicRoutes } from './share';
import { downloadRoutes } from './download';
import { uploadKeyRoutes, uploadKeyPublicRoutes } from './upload-keys';
import { uploadPublicRoutes } from './upload-public';
import { uploadLogRoutes } from './upload-logs';
import { storageConfigRoutes } from './storage-config';
import { picgoRoutes } from './picgo';
import { galleryRoutes } from './gallery';
import { imgbedRoutes } from './imgbed';
import { renderDashboard } from './html/dashboard';
import { renderGallery } from './html/gallery';
import { renderLogin } from './html/login';
import { renderSharePage } from './html/share';
import { renderUploadKeyPage } from './html/upload-key';
import { renderPublicUploadPage } from './html/public-upload';
import { renderDemo } from './html/demo';
import { renderImgbed } from './html/imgbed';
import { createStorageEngine } from './storage-engine';
import { webdavRoutes } from './webdav';
import { randomRoutes, randomAdminRoutes } from './random';
import { moderationAdminRoutes } from './moderation-admin';
import { rateLimitMiddleware } from './rate-limit';
import { getSafeImageContentType } from './upload-utils';
import { assertSafeStorageKey } from './storage-path';

const app = new Hono<{ Bindings: Env }>();

// 启用 Cloudflare 防火墙限流中间件
app.use('*', rateLimitMiddleware());

app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-Frame-Options', 'DENY');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
});

app.use('/api/*', cors());


// ── Demo site hostname ────────────────────

const DEMO_HOST = 'demo.iodevo.com';
const isDemoHost = (c: Context<{ Bindings: Env }>) => (c.req.header('host') || '') === DEMO_HOST;

app.use('*', async (c, next) => {
  if (isDemoHost(c) && c.req.path === '/') {
    return c.html(renderDemo());
  }
  await next();
});

// 演示站禁止实际上传文件
app.use('/api/upload/*', async (c, next) => {
  if (isDemoHost(c)) return c.json({ error: '演示环境禁止实际上传文件' }, 403);
  await next();
});
app.use('/api/upload-public/*', async (c, next) => {
  if (isDemoHost(c)) return c.json({ error: '演示环境禁止实际上传文件' }, 403);
  await next();
});
app.use('/api/imgbed/upload', async (c, next) => {
  if (isDemoHost(c)) return c.json({ error: '演示环境禁止实际上传文件' }, 403);
  await next();
});

// 演示站禁止删除操作
app.use('/api/*', async (c, next) => {
  if (isDemoHost(c) && c.req.method === 'DELETE') {
    return c.json({ error: '演示环境禁止删除操作' }, 403);
  }
  await next();
});

// 演示站数据 mock
app.use('/api/*', async (c, next) => {
  if (isDemoHost(c) && c.req.method === 'GET') {
    const path = c.req.path;
    const now = new Date().toISOString();
    const d1 = new Date(Date.now() - 86400000).toISOString();
    const d2 = new Date(Date.now() - 186400000).toISOString();
    const d3 = new Date(Date.now() - 3600000).toISOString();
    
    if (path === '/api/files') {
      const prefix = c.req.query('prefix') || 'uploads/';
      let files: any[] = [], folders: any[] = [];
      if (prefix === 'uploads/') {
        files = [
          { key: 'uploads/demo-presentation.pdf', name: 'demo-presentation.pdf', size: 2450000, uploaded: d1 },
          { key: 'uploads/project-assets.zip', name: 'project-assets.zip', size: 15600000, uploaded: d2 },
          { key: 'uploads/README.md', name: 'README.md', size: 1250, uploaded: now }
        ];
        folders = [
          { path: 'uploads/Documents/', name: 'Documents' },
          { path: 'uploads/Images/', name: 'Images' },
          { path: 'uploads/Shared/', name: 'Shared' }
        ];
      } else if (prefix === 'uploads/Images/') {
        files = [
          { key: 'uploads/Images/design-mockup.png', name: 'design-mockup.png', size: 3400000, uploaded: d3 },
          { key: 'uploads/Images/logo.svg', name: 'logo.svg', size: 45000, uploaded: d2 }
        ];
      } else if (prefix === 'uploads/Documents/') {
        files = [
          { key: 'uploads/Documents/Q3-Report.docx', name: 'Q3-Report.docx', size: 1200000, uploaded: d1 }
        ];
      }
      return c.json({
        files,
        folders,
        ancestors: prefix !== 'uploads/' ? [{path: 'uploads/', name: 'uploads'}] : []
      });
    }
    
    if (path === '/api/upload-logs/logs') {
      return c.json({
        logs: [
          { logKey: 'ul1', name: 'demo-presentation.pdf', size: 2450000, ip: '10.0.0.1', country: 'CN', time: d1, source: 'dashboard' },
          { logKey: 'ul2', name: 'project-assets.zip', size: 15600000, ip: '10.0.0.2', country: 'US', time: d2, source: 'public' },
          { logKey: 'ul3', name: 'design-mockup.png', size: 3400000, ip: '10.0.0.3', country: 'JP', time: d3, source: 'upload-key', uploadKeyLabel: '访客上传' }
        ],
        total: 3
      });
    }

    if (path === '/api/download/logs') {
      return c.json({
        logs: [
          { logKey: 'dl1', name: 'demo-presentation.pdf', size: 2450000, ip: '10.0.0.4', country: 'SG', time: d1, source: 'r2', completed: true },
          { logKey: 'dl2', name: 'project-assets.zip', size: 15600000, ip: '10.0.0.5', country: 'HK', time: d2, source: 's3', completed: false }
        ],
        total: 2
      });
    }
    
    if (path.startsWith('/api/share/info/')) {
      const token = path.slice('/api/share/info/'.length);
      const item = token === 'demoToken001'
        ? { token, key: 'uploads/demo-presentation.pdf', name: 'demo-presentation.pdf', size: 2450000, created: d1, noAd: false, downloads: 12 }
        : token === 'demoToken002'
          ? { token, key: 'uploads/project-assets.zip', name: 'project-assets.zip', size: 15600000, created: d2, noAd: false, downloads: 5 }
          : null;
      return item ? c.json(item) : c.json({ error: '分享链接不存在' }, 404);
    }

    if (path === '/api/share') {
      return c.json({
        shares: [
          { token: 'demoToken001', key: 'uploads/demo-presentation.pdf', name: 'demo-presentation.pdf', downloads: 12, created: d1, expires: null },
          { token: 'demoToken002', key: 'uploads/project-assets.zip', name: 'project-assets.zip', downloads: 5, created: d2, expires: new Date(Date.now() + 86400000).toISOString() }
        ]
      });
    }
    
    if (path.startsWith('/api/upload-keys/validate/')) {
      const id = path.slice('/api/upload-keys/validate/'.length);
      if (id === 'demoKey00001') return c.json({ valid: true, label: '访客上传', path: 'uploads/Guest/' });
      return c.json({ valid: false, error: '链接不存在' }, 404);
    }

    if (path === '/api/upload-keys') {
      return c.json({
        keys: [
          { id: 'demoKey00001', label: '访客上传', path: 'uploads/Guest/', usedCount: 3, created: d2, expires: new Date(Date.now() + 86400000).toISOString(), active: true },
          { id: 'demoKey00002', label: '设计文件收取', path: 'uploads/Design/', usedCount: 15, created: d1, expires: new Date(Date.now() - 86400000).toISOString(), active: false }
        ]
      });
    }
    
    if (path === '/api/imgbed/list') {
      return c.json({
        items: [
          { key: 'imgbed/dashboard.jpg', name: 'dashboard.jpg', url: 'https://cdn.jsdelivr.net/gh/Mareixcode/Cloudflare-ioDrive@main/docs/images/screenshots/dashboard.jpg', size: 68227, uploaded_at: d1 },
          { key: 'imgbed/upload.png', name: 'upload.png', url: 'https://cdn.jsdelivr.net/gh/Mareixcode/Cloudflare-ioDrive@main/docs/images/screenshots/upload.png', size: 40807, uploaded_at: d2 }
        ]
      });
    }
  }
  await next();
});

// ── Pages ─────────────────────────────────

app.get('/login', (c) => c.html(renderLogin(c.env.TURNSTILE_SITE_KEY)));
app.get('/dashboard', (c) => c.html(renderDashboard(isDemoHost(c))));
app.get('/', (c) => c.html(renderDashboard(isDemoHost(c))));
app.get('/s/:token', (c) => {
  const token = c.req.param('token');
  if (!/^[A-Za-z0-9]{12}$/.test(token)) return c.text('Not Found', 404);
  return new Response(renderSharePage(token, c.env.TURNSTILE_SITE_KEY), {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
});
app.get('/u/:keyId', (c) => {
  const keyId = c.req.param('keyId');
  if (!/^[A-Za-z0-9]{12}$/.test(keyId)) return c.text('Not Found', 404);
  return c.html(renderUploadKeyPage(keyId, c.env.TURNSTILE_SITE_KEY));
});
app.get('/upload', (c) => c.html(renderPublicUploadPage(c.env.TURNSTILE_SITE_KEY)));
app.get('/gallery', (c) => c.html(renderGallery()));
app.get('/imgbed', (c) => c.html(renderImgbed(c.env.TURNSTILE_SITE_KEY)));

// ── Public Image Stream (For Imgbed / Gallery / PicGo fallbacks) ──
app.get('/f/:key{.+}', async (c) => {
  const key = c.req.param('key');
  try {
    assertSafeStorageKey(key);
  } catch {
    return c.json({ error: '文件路径无效' }, 400);
  }
  const contentType = getSafeImageContentType(key);
  if (!contentType) {
    return c.json({ error: '仅支持图片文件的公开访问' }, 403);
  }
  try {
    const engine = await createStorageEngine(c.env);
    const obj = await engine.get(key);
    if (!obj) return c.text('Not Found', 404);
    if (!obj.body) return c.text('Storage response has no body', 502);
    return new Response(obj.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-Content-Type-Options': 'nosniff',
      }
    });
  } catch (error) {
    console.error(JSON.stringify({ message: 'public image fetch failed', error: error instanceof Error ? error.message : String(error), key }));
    return c.text('Internal Error', 500);
  }
});

// ── API ───────────────────────────────────

app.route('/api/auth', authRoutes);
app.route('/api/files', filesRoutes);
app.route('/api/upload', uploadRoutes);
app.route('/api/share', sharePublicRoutes);
app.route('/api/share', shareRoutes);
app.route('/api/download', downloadRoutes);
app.route('/api/upload-keys', uploadKeyPublicRoutes);
app.route('/api/upload-keys', uploadKeyRoutes);
app.route('/api/upload-public', uploadPublicRoutes);
app.route('/api/upload-logs', uploadLogRoutes);
app.route('/api/storage', storageConfigRoutes);
app.route('/api/moderation', moderationAdminRoutes);
app.route('/api/random', randomAdminRoutes);
app.route('/api/picgo', picgoRoutes);
app.route('/api/gallery', galleryRoutes);
app.route('/api/imgbed', imgbedRoutes);

app.route('/dav', webdavRoutes);
app.route('/random', randomRoutes);




// ── SEO ───────────────────────────────────

app.get('/robots.txt', (c) => {
  const origin = new URL(c.req.url).origin;
  return c.text(`User-agent: *
Allow: /login
Allow: /u/*
Allow: /upload
Disallow: /s/
Disallow: /api/*
Disallow: /

Sitemap: ${origin}/sitemap.xml`);
});

app.get('/sitemap.xml', (c) => {
  const origin = new URL(c.req.url).origin;
  const urls = ['/login', '/upload']
    .map((path) => `  <url><loc>${origin}${path}</loc></url>`)
    .join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
  );
});

app.notFound((c) => c.text('Not Found', 404));

app.onError((error, c) => {
  console.error('Unhandled request error:', error);
  if (error instanceof SyntaxError && c.req.path.startsWith('/api/')) {
    return c.json({ error: '请求格式无效' }, 400);
  }
  return c.json({ error: '服务器内部错误' }, 500);
});

export default app;
