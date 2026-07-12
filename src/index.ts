import { Hono } from 'hono';
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
import { ensureD1Schema, createMetadataStore } from './metadata-store';
import { createStorageEngine } from './storage-engine';
import { webdavRoutes } from './webdav';
import { randomRoutes, randomAdminRoutes } from './random';
import { moderationAdminRoutes } from './moderation-admin';
import { rateLimitMiddleware } from './rate-limit';

const app = new Hono<{ Bindings: Env }>();

// 启用 Cloudflare 防火墙限流中间件
app.use('*', rateLimitMiddleware());

app.use('/api/*', cors());

// ── D1 schema 初始化（异步触发，不阻塞请求） ──
//
// 通过在 fetch 入口尝试初始化 D1 表结构，使得第一次启动时无需手动跑迁移脚本。
// 初始化逻辑幂等（CREATE IF NOT EXISTS），多次执行安全。
app.use('*', async (c, next) => {
  if (c.env.META_DB) {
    c.executionCtx.waitUntil(ensureD1Schema(c.env));
  }
  await next();
});

// ── Demo site hostname ────────────────────

const DEMO_HOST = 'demo.iodevo.com';
const isDemoHost = (c: any) => (c.req.header('host') || '') === DEMO_HOST;

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
    
    if (path === '/api/share') {
      return c.json({
        shares: [
          { token: 'demo1', key: 'demo-presentation.pdf', name: 'demo-presentation.pdf', downloads: 12, created: d1, expires: null },
          { token: 'demo2', key: 'project-assets.zip', name: 'project-assets.zip', downloads: 5, created: d2, expires: new Date(Date.now() + 86400000).toISOString() }
        ]
      });
    }
    
    if (path === '/api/upload-keys') {
      return c.json({
        keys: [
          { id: 'key1', label: '访客上传', path: 'uploads/Guest/', usedCount: 3, created: d2, expires: new Date(Date.now() + 86400000).toISOString(), active: true },
          { id: 'key2', label: '设计文件收取', path: 'uploads/Design/', usedCount: 15, created: d1, expires: new Date(Date.now() - 86400000).toISOString(), active: false }
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
app.get('/s/:token', (c) => c.html(renderSharePage(c.req.param('token'), c.env.TURNSTILE_SITE_KEY)));
app.get('/u/:keyId', (c) => c.html(renderUploadKeyPage(c.req.param('keyId'), c.env.TURNSTILE_SITE_KEY)));
app.get('/upload', (c) => c.html(renderPublicUploadPage(c.env.TURNSTILE_SITE_KEY)));
app.get('/gallery', (c) => c.html(renderGallery()));
app.get('/imgbed', (c) => c.html(renderImgbed(c.env.TURNSTILE_SITE_KEY)));

// ── Public Image Stream (For Imgbed / Gallery / PicGo fallbacks) ──
app.get('/f/:key{.+}', async (c) => {
  const key = c.req.param('key');
  const ext = key.split('.').pop()?.toLowerCase() || '';
  const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  if (!ALLOWED_EXTS.includes(ext)) {
    return c.json({ error: '仅支持图片文件的公开访问' }, 403);
  }
  try {
    const engine = await createStorageEngine(c.env);
    const obj = await engine.get(key);
    if (!obj) return c.text('Not Found', 404);
    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
      }
    });
  } catch (err: any) {
    console.error('Public fetch error:', err);
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

// ── Migration: R2 JSON -> D1 ────────────────
//
// POST /api/migration/r2-to-d1
// 一次性将 R2 中以 _config/ / _shares/ / _dl_logs/ / _ul_logs/ / _upload_keys/ / _multipart/
// 为前缀的 JSON 文件批量读取并写入 D1（如果 D1 启用）。幂等。
import { jwtAuth } from './auth';

const MIGRATION_PREFIXES = [
  '_config/',
  '_shares/',
  '_dl_logs/',
  '_ul_logs/',
  '_upload_keys/',
  '_multipart/',
  '_moderation_logs/',
];

app.post('/api/migration/r2-to-d1', jwtAuth, async (c) => {
  if (!c.env.META_DB) {
    return c.json({ error: 'D1 未配置（缺少 META_DB binding）' }, 400);
  }
  if (!c.env.DRIVE) {
    return c.json({ error: 'R2 未配置，无法读取源数据' }, 400);
  }

  const meta = createMetadataStore(c.env);
  if (meta.kind !== 'd1') {
    return c.json({ error: '当前 MetadataStore 不是 D1 实现' }, 400);
  }

  const stats: Record<string, number> = {};
  const errors: string[] = [];

  for (const prefix of MIGRATION_PREFIXES) {
    let count = 0;
    let cursor: string | undefined;
    do {
      const listed = await c.env.DRIVE.list({ prefix, limit: 1000, cursor });
      for (const obj of listed.objects) {
        try {
          const data = await c.env.DRIVE.get(obj.key);
          if (!data) continue;
          const text = await data.text();
          const value = JSON.parse(text);
          // key 不带 .json 后缀
          const key = obj.key.endsWith('.json') ? obj.key.slice(0, -5) : obj.key;
          await meta.put(key, value);
          count++;
        } catch (e: any) {
          errors.push(`${obj.key}: ${e?.message || e}`);
        }
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);
    stats[prefix] = count;
  }

  // 标记已迁移
  await meta.put('_config/_migration_v1', {
    timestamp: new Date().toISOString(),
    stats,
    errorCount: errors.length,
  });

  return c.json({ ok: true, stats, errors: errors.slice(0, 20) });
});

// ── SEO ───────────────────────────────────

app.get('/robots.txt', (c) =>
  c.text(`User-agent: *
Allow: /login
Allow: /s/*
Allow: /u/*
Allow: /upload
Disallow: /api/*
Disallow: /

Sitemap: https://drive.example.com/sitemap.xml`)
);

app.get('/sitemap.xml', async (c) => {
  try {
    const meta = createMetadataStore(c.env);
    const { keys } = await meta.list('_shares/', { limit: 1000 });
    const urls = keys
      .map((key) => {
        const token = key.replace('_shares/', '').replace('.json', '');
        return `  <url><loc>https://drive.example.com/s/${token}</loc></url>`;
      })
      .join('\n');
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://drive.example.com/login</loc></url>
${urls}
</urlset>`,
      { headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
    );
  } catch {
    return new Response('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }
});

app.notFound((c) => c.text('Not Found', 404));

export default app;
