import { Hono, type Context, type Next } from 'hono';
import { SignJWT, jwtVerify } from 'jose';
import type { Env, JwtPayload } from './types';
import { verifyTurnstile } from './turnstile';
import { createMetadataStore, type MetadataStore } from './metadata-store';

// ── Admin config ─────────────────────────

interface AdminConfig {
  username: string;
  passwordHash: string;
  passwordSalt?: string;
  passwordIterations?: number;
  passwordAlgorithm?: 'PBKDF2-SHA256';
  updatedAt: string;
}

const ADMIN_CONFIG_KEY = '_config/admin';
const LOGIN_ATTEMPTS_PREFIX = '_config/login_attempts/';
const PASSWORD_ITERATIONS = 210_000;

interface LoginAttempt {
  count: number;
  blockedUntil: number;
}

function bytesToHex(bytes: ArrayBuffer | ArrayBufferView): string {
  const view = bytes instanceof ArrayBuffer
    ? new Uint8Array(bytes)
    : new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return [...view].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) throw new Error('密码配置损坏');
  return Uint8Array.from(hex.match(/.{2}/g) || [], byte => parseInt(byte, 16));
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return bytesToHex(hash);
}

async function secureStringEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  return crypto.subtle.timingSafeEqual(leftHash, rightHash);
}

async function derivePasswordHash(password: string, saltHex: string, iterations: number): Promise<string> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations },
    material,
    256,
  );
  return bytesToHex(bits);
}

async function createPasswordFields(password: string): Promise<Pick<AdminConfig, 'passwordHash' | 'passwordSalt' | 'passwordIterations' | 'passwordAlgorithm'>> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const passwordSalt = bytesToHex(salt);
  return {
    passwordHash: await derivePasswordHash(password, passwordSalt, PASSWORD_ITERATIONS),
    passwordSalt,
    passwordIterations: PASSWORD_ITERATIONS,
    passwordAlgorithm: 'PBKDF2-SHA256',
  };
}

async function loadAdminConfig(meta: MetadataStore): Promise<AdminConfig | null> {
  return meta.get<AdminConfig>(ADMIN_CONFIG_KEY);
}

async function saveAdminConfig(meta: MetadataStore, config: AdminConfig): Promise<void> {
  config.updatedAt = new Date().toISOString();
  await meta.put(ADMIN_CONFIG_KEY, config);
}

// 验证凭证：优先 R2/D1 自定义配置，回退到环境变量
async function verifyCredentials(env: Env, username: string, password: string): Promise<boolean> {
  const meta = createMetadataStore(env);
  const adminConfig = await loadAdminConfig(meta);
  if (adminConfig) {
    const usernameMatchesPromise = secureStringEqual(username, adminConfig.username);
    let passwordMatchesPromise: Promise<boolean>;
    if (adminConfig.passwordAlgorithm === 'PBKDF2-SHA256' && adminConfig.passwordSalt && adminConfig.passwordIterations) {
      passwordMatchesPromise = derivePasswordHash(password, adminConfig.passwordSalt, adminConfig.passwordIterations)
        .then(hash => secureStringEqual(hash, adminConfig.passwordHash));
    } else {
      passwordMatchesPromise = sha256Hex(password).then(hash => secureStringEqual(hash, adminConfig.passwordHash));
    }
    const [usernameMatches, passwordMatches] = await Promise.all([usernameMatchesPromise, passwordMatchesPromise]);
    if (usernameMatches && passwordMatches && !adminConfig.passwordSalt) {
      await saveAdminConfig(meta, {
        username: adminConfig.username,
        ...(await createPasswordFields(password)),
        updatedAt: adminConfig.updatedAt,
      });
    }
    return usernameMatches && passwordMatches;
  }

  if (!env.ADMIN_USER || !env.ADMIN_PASS) return false;
  const [usernameMatches, passwordMatches] = await Promise.all([
    secureStringEqual(username, env.ADMIN_USER),
    secureStringEqual(password, env.ADMIN_PASS),
  ]);
  return usernameMatches && passwordMatches;
}

// ── Auth routes ───────────────────────────
export const authRoutes = new Hono<{ Bindings: Env }>();

async function loginAttemptKey(ip: string): Promise<string> {
  return LOGIN_ATTEMPTS_PREFIX + await sha256Hex(ip);
}

async function checkRateLimit(meta: MetadataStore, key: string): Promise<boolean> {
  const entry = await meta.get<LoginAttempt>(key);
  if (!entry) return true;
  if (entry.blockedUntil > Date.now()) return false;
  if (entry.blockedUntil > 0) await meta.delete(key);
  return true;
}

async function recordFailure(meta: MetadataStore, key: string): Promise<void> {
  const entry = await meta.get<LoginAttempt>(key) || { count: 0, blockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 5) {
    entry.blockedUntil = Date.now() + 5 * 60 * 1000;
    entry.count = 0;
  }
  await meta.put(key, entry);
}

async function clearFailures(meta: MetadataStore, key: string): Promise<void> {
  await meta.delete(key);
}

// Login
authRoutes.post('/login', async (c) => {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const meta = createMetadataStore(c.env);
  const attemptKey = await loginAttemptKey(ip);

  if (!(await checkRateLimit(meta, attemptKey))) {
    return c.json({ error: '登录尝试过多，请 5 分钟后再试' }, 429);
  }

  const body = await c.req.json<{ username?: unknown; password?: unknown; turnstile?: unknown }>().catch(() => null);
  if (!body || typeof body.username !== 'string' || typeof body.password !== 'string') {
    return c.json({ error: '登录参数无效' }, 400);
  }
  const { username, password, turnstile } = body;
  if (!username || !password || username.length > 128 || password.length > 1024) {
    return c.json({ error: '登录参数无效' }, 400);
  }

  // Verify Turnstile
  if (c.env.TURNSTILE_SECRET) {
    if (typeof turnstile !== 'string' || !turnstile) {
      return c.json({ error: '请完成人机验证' }, 400);
    }

    const turnstileValid = await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET, ip);
    if (!turnstileValid) {
      return c.json({ error: '人机验证失败，请重试' }, 403);
    }
  }

  const valid = await verifyCredentials(c.env, username, password);
  if (!valid) {
    await recordFailure(meta, attemptKey);
    return c.json({ error: '用户名或密码错误' }, 401);
  }

  await clearFailures(meta, attemptKey);

  if (!c.env.JWT_SECRET) return c.json({ error: '服务端认证配置不完整' }, 500);

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
  if (!c.env.META_DB) {
    return c.json({ username: c.env.ADMIN_USER, hasCustomConfig: false });
  }
  const meta = createMetadataStore(c.env);
  const adminConfig = await loadAdminConfig(meta);
  const username = adminConfig?.username || c.env.ADMIN_USER;
  return c.json({ username, hasCustomConfig: !!adminConfig });
});

// PUT /api/auth/admin-config — 修改管理员账号密码
authRoutes.put('/admin-config', jwtAuth, async (c) => {
  if (!c.env.META_DB) {
    return c.json({ error: '当前环境未开启 D1 数据库，无法修改账号配置' }, 400);
  }
  const body = await c.req.json<{ username?: unknown; currentPassword?: unknown; newPassword?: unknown }>().catch(() => null);
  if (!body || typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string') {
    return c.json({ error: '请求参数无效' }, 400);
  }
  const { username, currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return c.json({ error: '请填写当前密码和新密码' }, 400);
  }

  if (newPassword.length < 8 || newPassword.length > 1024) {
    return c.json({ error: '新密码长度必须为 8 到 1024 位' }, 400);
  }
  if (username !== undefined && (typeof username !== 'string' || !username.trim() || username.length > 128)) {
    return c.json({ error: '用户名无效' }, 400);
  }

  // 验证当前密码
  const meta = createMetadataStore(c.env);
  const adminConfig = await loadAdminConfig(meta);
  const currentUsername = adminConfig?.username || c.env.ADMIN_USER;
  const valid = await verifyCredentials(c.env, currentUsername, currentPassword);
  if (!valid) {
    return c.json({ error: '当前密码错误' }, 401);
  }

  // 保存新配置
  const newConfig: AdminConfig = {
    username: typeof username === 'string' ? username.trim() : currentUsername,
    ...(await createPasswordFields(newPassword)),
    updatedAt: '',
  };

  await saveAdminConfig(meta, newConfig);
  return c.json({ ok: true });
});

// ── JWT Middleware ─────────────────────────
export async function jwtAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: '未授权' }, 401);
  }

  try {
    const token = auth.slice(7);
    if (!c.env.JWT_SECRET) return c.json({ error: '服务端认证配置不完整' }, 500);
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    if (payload.sub !== 'admin' || payload.role !== 'admin') throw new Error('Invalid token claims');
    await next();
  } catch {
    return c.json({ error: 'Token 无效或已过期' }, 401);
  }
}
