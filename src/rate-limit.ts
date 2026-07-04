import type { MiddlewareHandler } from 'hono';
import type { Env } from './types';

/**
 * Cloudflare Workers 速率限制限流中间件（防火墙限流）
 */
export const rateLimitMiddleware = (): MiddlewareHandler<{ Bindings: Env }> => {
  return async (c, next) => {
    if (c.env.RATE_LIMITER) {
      const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
      try {
        const { success } = await c.env.RATE_LIMITER.limit({ key: ip });
        if (!success) {
          return c.json({ error: '请求过于频繁，请稍后再试 (Rate limit exceeded)' }, 429);
        }
      } catch (err) {
        console.error('Rate limiter check failed:', err);
        // 防火墙限流服务异常时优雅降级，允许访问
      }
    }
    await next();
  };
};
