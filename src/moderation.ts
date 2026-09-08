// 内容审核
//
// 在文件上传到存储后异步触发，不阻塞用户上传返回。
// 命中规则后软删（物理删除 + 写审核日志）。
//
// Provider 接口允许插入不同的后端：
//   - ModerateContentProvider: moderatecontent.com REST API
//   - NsfwJsProvider: 自部署 nsfwjs 实例

import type { Env, ModerationConfig, ModerationLogEntry } from './types';
import { createMetadataStore } from './metadata-store';
import { createStorageEngine } from './storage-engine';
import { clearFileCache } from './cache';

const MODERATION_CONFIG_KEY = '_config/moderation';
export const MODERATION_LOG_PREFIX = '_moderation_logs/';

export interface ModerationResult {
  label: 'safe' | 'racy' | 'adult';
  scores: Record<string, number>;
  raw: unknown;
}

export interface ModerationProvider {
  name: string;
  moderate(input: { url: string; contentType: string; size: number }): Promise<ModerationResult>;
}

export class ModerateContentProvider implements ModerationProvider {
  name = 'moderatecontent';
  constructor(private apiKey: string) {}
  async moderate({ url }: { url: string; contentType: string; size: number }): Promise<ModerationResult> {
    const res = await fetch('https://api.moderatecontent.com/moderate/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `key=${encodeURIComponent(this.apiKey)}&url=${encodeURIComponent(url)}`,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`moderatecontent API ${res.status}`);
    const data = await res.json() as any;
    const rating = (data.rating_label || 'safe').toLowerCase();
    return {
      label: rating === 'adult' ? 'adult' : rating === 'teen' || rating === 'racy' ? 'racy' : 'safe',
      scores: {
        adult: data.prediction?.adult ?? 0,
        racy: data.prediction?.teen ?? 0,
      },
      raw: data,
    };
  }
}

export class NsfwJsProvider implements ModerationProvider {
  name = 'nsfwjs';
  constructor(private apiPath: string) {}
  async moderate({ url }: { url: string; contentType: string; size: number }): Promise<ModerationResult> {
    const endpoint = this.apiPath + (this.apiPath.includes('?') ? '&' : '?') + 'url=' + encodeURIComponent(url);
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`nsfwjs API ${res.status}`);
    const data = await res.json() as any;
    const adult = Number(data.adult ?? data.Adult ?? 0);
    const racy = Number(data.racy ?? data.Racy ?? 0);
    return {
      label: adult > 0.9 ? 'adult' : adult > 0.7 ? 'racy' : 'safe',
      scores: { adult, racy },
      raw: data,
    };
  }
}

export function createModerationProvider(cfg: ModerationConfig): ModerationProvider | null {
  if (!cfg.enabled || cfg.provider === 'none') return null;
  if (cfg.provider === 'moderatecontent' && cfg.apiKey) {
    return new ModerateContentProvider(cfg.apiKey);
  }
  if (cfg.provider === 'nsfwjs' && cfg.apiPath) {
    return new NsfwJsProvider(cfg.apiPath);
  }
  return null;
}

/**
 * 读取审核配置（默认关闭）
 */
export async function getModerationConfig(env: Env): Promise<ModerationConfig | null> {
  if (!env.META_DB) return null;
  const meta = createMetadataStore(env);
  return await meta.get<ModerationConfig>(MODERATION_CONFIG_KEY);
}

/**
 * 审核入口：异步调用，命中规则则删除文件
 */
export async function moderateAndCleanup(env: Env, info: {
  key: string;
  name: string;
  size: number;
  contentType: string;
  ip: string;
  ua: string;
  source: ModerationLogEntry['source'];
}): Promise<void> {
  try {
    const cfg = await getModerationConfig(env);
    if (!cfg || !cfg.enabled) return;

    const provider = createModerationProvider(cfg);
    if (!provider) return;

    // 跳过：类型不在白名单
    if (cfg.fileTypes?.length && !cfg.fileTypes.some(t =>
      t.endsWith('/*') ? info.contentType.startsWith(t.slice(0, -1)) : info.contentType === t
    )) {
      return;
    }

    // 跳过：超过大小限制
    if (cfg.maxSize && info.size > cfg.maxSize) return;

    // 生成可访问的 URL 给 provider 调用
    // 优先用 R2 public domain，否则用 presigned URL
    let fileUrl: string;
    if (env.PUBLIC_DOMAIN) {
      fileUrl = `https://${env.PUBLIC_DOMAIN}/${info.key.split('/').map(encodeURIComponent).join('/')}`;
    } else {
      // 没有 public domain，跳过（避免向 provider 暴露内部 presign 链接）
      console.warn('Moderation skipped: PUBLIC_DOMAIN not configured');
      return;
    }

    let result: ModerationResult;
    try {
      result = await provider.moderate({
        url: fileUrl,
        contentType: info.contentType,
        size: info.size,
      });
    } catch (e) {
      // 超时 / 错误：视为 safe，不阻塞
      console.error('Moderation API error (treated as safe):', e);
      return;
    }

    const adultThreshold = cfg.thresholds?.adult ?? 0.9;
    const racyThreshold = cfg.thresholds?.racy ?? 0.7;

    let action: 'kept' | 'deleted' = 'kept';
    let reason: ModerationLogEntry['reason'] = 'safe';
    let label = result.label;

    if (label === 'adult' || (result.scores.adult ?? 0) >= adultThreshold) {
      action = 'deleted';
      reason = 'adult';
    } else if (label === 'racy' || (result.scores.racy ?? 0) >= racyThreshold) {
      // racy 默认仅记录不删除
      action = 'kept';
      reason = 'racy';
    } else {
      action = 'kept';
      reason = 'safe';
    }

    // 命中删除：物理删除文件
    if (action === 'deleted') {
      try {
        const engine = await createStorageEngine(env);
        await engine.delete(info.key);
        await clearFileCache(env, '', info.key);
      } catch (e) {
        console.error('Failed to delete moderated file:', e);
      }
    }

    // 写审核日志
    const logEntry: ModerationLogEntry = {
      time: new Date().toISOString(),
      key: info.key,
      name: info.name,
      size: info.size,
      contentType: info.contentType,
      ip: info.ip,
      ua: info.ua,
      provider: provider.name,
      label,
      scores: result.scores,
      reason,
      action,
      source: info.source,
    };
    const meta = createMetadataStore(env);
    const logId = Date.now().toString(36) + '_' + crypto.randomUUID();
    await meta.put(MODERATION_LOG_PREFIX + logId, logEntry);
  } catch (e) {
    console.error('moderateAndCleanup failed:', e);
  }
}
