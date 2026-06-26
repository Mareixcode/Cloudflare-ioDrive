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
import { renderDashboard } from './html/dashboard';
import { renderLogin } from './html/login';
import { renderSharePage } from './html/share';
import { renderUploadKeyPage } from './html/upload-key';
import { renderPublicUploadPage } from './html/public-upload';
import { renderDemo } from './html/demo';

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors());

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

// 演示站禁止删除操作
app.use('/api/*', async (c, next) => {
  if (isDemoHost(c) && c.req.method === 'DELETE') {
    return c.json({ error: '演示环境禁止删除操作' }, 403);
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
  const listed = await c.env.DRIVE.list({ prefix: '_shares/' });
  const urls = listed.objects
    .map((obj) => {
      const token = obj.key.replace('_shares/', '').replace('.json', '');
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
});

app.notFound((c) => c.text('Not Found', 404));

export default app;
