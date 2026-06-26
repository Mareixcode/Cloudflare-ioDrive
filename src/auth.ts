import { Hono } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import type { Env, JwtPayload } from './types';
import { verifyTurnstile } from './turnstile';

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

  if (username !== c.env.ADMIN_USER || password !== c.env.ADMIN_PASS) {
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
