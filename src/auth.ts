import { Hono } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import type { Env, JwtPayload } from './types';
import { verifyTurnstile } from './turnstile';

// ── Admin config ─────────────────────────

interface AdminConfig {
  username: string;
  passwordHash: string;
  updatedAt: string;
}

const ADMIN_CONFIG_KEY = '_config/admin.json';

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function loadAdminConfig(drive: R2Bucket | undefined): Promise<AdminConfig | null> {
  if (!drive) return null;
  try {
    const obj = await drive.get(ADMIN_CONFIG_KEY);
    if (!obj) return null;
    return JSON.parse(await obj.text());
  } catch {
    return null;
  }
}

async function saveAdminConfig(drive: R2Bucket | undefined, config: AdminConfig): Promise<void> {
  if (!drive) throw new Error('存储未配置：需要 R2 binding');
  config.updatedAt = new Date().toISOString();
  await drive.put(ADMIN_CONFIG_KEY, JSON.stringify(config), {
    httpMetadata: { contentType: 'application/json' },
  });
}

// 验证凭证：优先 R2 自定义配置，回退到环境变量
async function verifyCredentials(env: Env, username: string, password: string): Promise<boolean> {
  const adminConfig = await loadAdminConfig(env.DRIVE);
  if (adminConfig) {
    const hash = await sha256Hex(password);
    return username === adminConfig.username && hash === adminConfig.passwordHash;
  }
  // 回退到环境变量
  return username === env.ADMIN_USER && password === env.ADMIN_PASS;
}

// ── Auth routes ───────────────────────────
export const authRoutes = new Hono<{ Bindings: Env }>();

// Simple in-memory rate limiter (per isolate, resets on cold start)
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();

function checkRateLimit(ip: string): boolean {
  const entry = loginAttempts.get(ip);
  if (!entry) return true;
  if (entry.blockedUntil > Date.now()) return false;
  if (entry.blockedUntil > 0 && entry.blockedUntil <= Date.now()) {
    loginAttempts.delete(ip);
    return true;
  }
  return true;
}

function recordFailure(ip: string) {
  const entry = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  entry.count++;
  if (entry.count >= 5) {
    entry.blockedUntil = Date.now() + 5 * 60 * 1000;
    entry.count = 0;
  }
  loginAttempts.set(ip, entry);
}

function clearFailures(ip: string) {
  loginAttempts.delete(ip);
}

// Login
authRoutes.post('/login', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

  if (!checkRateLimit(ip)) {
    return c.json({ error: '登录尝试过多，请 5 分钟后再试' }, 429);
  }

  const body = await c.req.json<{ username: string; password: string; turnstile: string }>();
  const { username, password, turnstile } = body;

  // Verify Turnstile
  if (!turnstile) {
    return c.json({ error: '请完成人机验证' }, 400);
  }

  const turnstileValid = await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET, ip);
  if (!turnstileValid) {
    return c.json({ error: '人机验证失败，请重试' }, 403);
  }

  const valid = await verifyCredentials(c.env, username, password);
  if (!valid) {
    recordFailure(ip);
    return c.json({ error: '用户名或密码错误' }, 401);
  }

  clearFailures(ip);

  const secret = new TextEncoder().encode(c.env.JWT_SECRET);
  const token = await new SignJWT({ sub: 'admin', role: 'admin' } as JwtPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);

  return c.json({ token });
});

// ── Admin config API ──────────────────────

// GET /api/auth/admin-config — 获取管理员配置信息
authRoutes.get('/admin-config', jwtAuth, async (c) => {
  const adminConfig = await loadAdminConfig(c.env.DRIVE);
  const username = adminConfig?.username || c.env.ADMIN_USER;
  return c.json({ username, hasCustomConfig: !!adminConfig });
});

// PUT /api/auth/admin-config — 修改管理员账号密码
authRoutes.put('/admin-config', jwtAuth, async (c) => {
  const body = await c.req.json<{ username?: string; currentPassword: string; newPassword: string }>();
  const { username, currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return c.json({ error: '请填写当前密码和新密码' }, 400);
  }

  if (newPassword.length < 6) {
    return c.json({ error: '新密码长度不能少于 6 位' }, 400);
  }

  // 验证当前密码
  const adminConfig = await loadAdminConfig(c.env.DRIVE);
  const currentUsername = adminConfig?.username || c.env.ADMIN_USER;
  const valid = await verifyCredentials(c.env, currentUsername, currentPassword);
  if (!valid) {
    return c.json({ error: '当前密码错误' }, 401);
  }

  // 保存新配置
  const newConfig: AdminConfig = {
    username: username || currentUsername,
    passwordHash: await sha256Hex(newPassword),
    updatedAt: '',
  };

  await saveAdminConfig(c.env.DRIVE, newConfig);
  return c.json({ ok: true });
});

// ── JWT Middleware ─────────────────────────
export async function jwtAuth(c: any, next: () => Promise<void>) {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: '未授权' }, 401);
  }

  try {
    const token = auth.slice(7);
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    c.set('jwtPayload', payload);
    await next();
  } catch {
    return c.json({ error: 'Token 无效或已过期' }, 401);
  }
}

// JWT middleware alias for use within this file
const jwtAuthMiddleware = jwtAuth;
