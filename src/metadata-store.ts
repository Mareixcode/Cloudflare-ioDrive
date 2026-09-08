// MetadataStore 抽象层
//
// 统一管理 ioDrive 的所有元数据（_config/、_shares/、_dl_logs/、_ul_logs/、
// _upload_keys/、_multipart/、_moderation_logs/），对上层代码屏蔽底层存储实现。
//
// 工厂函数 createMetadataStore(env) 要求 env.META_DB 存在：
//   - 有 META_DB -> D1MetadataStore
//   - 无 META_DB -> 抛出错误

import type { Env } from './types';

// 类别常量
export const CATEGORY = {
  CONFIG: 'config',
  SHARES: 'shares',
  DL_LOGS: 'dl_logs',
  UL_LOGS: 'ul_logs',
  UPLOAD_KEYS: 'upload_keys',
  MULTIPART: 'multipart',
  MODERATION_LOGS: 'moderation_logs',
} as const;

export type Category = typeof CATEGORY[keyof typeof CATEGORY];

// key 前缀到 category 的映射（用于 D1 索引）
const PREFIX_TO_CATEGORY: Array<[string, Category]> = [
  ['_config/', CATEGORY.CONFIG],
  ['_shares/', CATEGORY.SHARES],
  ['_dl_logs/', CATEGORY.DL_LOGS],
  ['_ul_logs/', CATEGORY.UL_LOGS],
  ['_upload_keys/', CATEGORY.UPLOAD_KEYS],
  ['_multipart/', CATEGORY.MULTIPART],
  ['_moderation_logs/', CATEGORY.MODERATION_LOGS],
];

export function deriveCategory(key: string): Category {
  for (const [prefix, cat] of PREFIX_TO_CATEGORY) {
    if (key.startsWith(prefix)) return cat;
  }
  return CATEGORY.CONFIG; // fallback
}

// 抽取可索引字段
function extractIndexedFields(key: string, value: unknown): {
  category: Category;
  expires_at: number | null;
  key_path: string | null;
  time_ms: number | null;
  ip: string | null;
  label: string | null;
} {
  const category = deriveCategory(key);
  const record = typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : {};
  const expiresAt = typeof record.expires === 'string' ? Date.parse(record.expires) : NaN;
  const timeMs = typeof record.time === 'string' ? Date.parse(record.time) : NaN;
  return {
    category,
    expires_at: Number.isFinite(expiresAt) ? Math.floor(expiresAt / 1000) : null,
    key_path: record.key ? String(record.key) : null,
    time_ms: Number.isFinite(timeMs) ? Math.floor(timeMs / 1000) : null,
    ip: record.ip ? String(record.ip) : null,
    label: record.label ? String(record.label) : null,
  };
}

// ── 接口定义 ─────────────────────────────

export interface ListOptions {
  limit?: number;
  cursor?: string;
}

export interface ListResult {
  keys: string[];
  cursor?: string;
}

export interface MetadataStore {
  get<T = unknown>(key: string): Promise<T | null>;
  put(key: string, value: unknown): Promise<void>;
  incrementCounter<T = unknown>(key: string, field: string): Promise<T | null>;
  delete(key: string | string[]): Promise<void>;
  list(prefix: string, options?: ListOptions): Promise<ListResult>;
  /** 返回底层实现标识 */
  readonly kind: 'd1';
}



// ── D1 实现 ─────────────────────────────

interface KvRow {
  id: string;
  category: string;
  value: string;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
  key_path: string | null;
  time_ms: number | null;
  ip: string | null;
  label: string | null;
}

export class D1MetadataStore implements MetadataStore {
  readonly kind = 'd1' as const;

  constructor(private db: D1Database) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const row = await this.db
      .prepare('SELECT value FROM kv WHERE id = ?')
      .bind(key)
      .first<{ value: string }>();
    if (!row) return null;
    return JSON.parse(row.value) as T;
  }

  async put(key: string, value: unknown): Promise<void> {
    const idx = extractIndexedFields(key, value);
    const json = JSON.stringify(value);
    await this.db
      .prepare(
        `INSERT INTO kv (id, category, value, expires_at, key_path, time_ms, ip, label)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           category = excluded.category,
           value = excluded.value,
           expires_at = excluded.expires_at,
           key_path = excluded.key_path,
           time_ms = excluded.time_ms,
           ip = excluded.ip,
           label = excluded.label,
           updated_at = unixepoch()`
      )
      .bind(
        key,
        idx.category,
        json,
        idx.expires_at,
        idx.key_path,
        idx.time_ms,
        idx.ip,
        idx.label
      )
      .run();
  }

  async incrementCounter<T = unknown>(key: string, field: string): Promise<T | null> {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(field)) throw new Error('Invalid counter field');
    const path = `$.${field}`;
    const row = await this.db
      .prepare(
        `UPDATE kv
         SET value = json_set(value, ?, COALESCE(json_extract(value, ?), 0) + 1),
             updated_at = unixepoch()
         WHERE id = ?
         RETURNING value`
      )
      .bind(path, path, key)
      .first<{ value: string }>();
    return row ? JSON.parse(row.value) as T : null;
  }

  async delete(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];
    if (keys.length === 0) return;
    // 分批删除，每批最多 100 个
    for (let i = 0; i < keys.length; i += 100) {
      const batch = keys.slice(i, i + 100);
      const placeholders = batch.map(() => '?').join(',');
      await this.db
        .prepare(`DELETE FROM kv WHERE id IN (${placeholders})`)
        .bind(...batch)
        .run();
    }
  }

  async list(prefix: string, options: ListOptions = {}): Promise<ListResult> {
    const limit = options.limit ?? 1000;
    const cursor = options.cursor; // 上次返回的最大 id
    const likePrefix = prefix.replace(/([\\%_])/g, '\\$1') + '%';

    let rows: Array<{ id: string }>;
    if (cursor) {
      rows = await this.db
        .prepare(
          `SELECT id FROM kv WHERE id LIKE ? ESCAPE '\\' AND id > ?
           ORDER BY id LIMIT ?`
        )
        .bind(likePrefix, cursor, limit)
        .all<{ id: string }>()
        .then(r => r.results);
    } else {
      rows = await this.db
        .prepare(
          `SELECT id FROM kv WHERE id LIKE ? ESCAPE '\\'
           ORDER BY id LIMIT ?`
        )
        .bind(likePrefix, limit)
        .all<{ id: string }>()
        .then(r => r.results);
    }

    const keys = rows.map(r => r.id);
    const nextCursor = keys.length === limit ? keys[keys.length - 1] : undefined;
    return { keys, cursor: nextCursor };
  }
}

// ── 工厂函数 ─────────────────────────────

export function createMetadataStore(env: Env): MetadataStore {
  if (!env.META_DB) {
    throw new Error('META_DB (D1) binding is required. Please configure [[d1_databases]] in wrangler.toml.');
  }
  return new D1MetadataStore(env.META_DB);
}
