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
function extractIndexedFields(key: string, value: any): {
  category: Category;
  expires_at: number | null;
  key_path: string | null;
  time_ms: number | null;
  ip: string | null;
  label: string | null;
} {
  const category = deriveCategory(key);
  return {
    category,
    expires_at: value?.expires ? Math.floor(Date.parse(value.expires) / 1000) : null,
    key_path: value?.key ? String(value.key) : null,
    time_ms: value?.time ? Math.floor(Date.parse(value.time) / 1000) : null,
    ip: value?.ip ? String(value.ip) : null,
    label: value?.label ? String(value.label) : null,
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
  delete(key: string | string[]): Promise<void>;
  list(prefix: string, options?: ListOptions): Promise<ListResult>;
  /** 返回底层实现标识（R2 / D1） */
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
    try {
      const row = await this.db
        .prepare('SELECT value FROM kv WHERE id = ?')
        .bind(key)
        .first<{ value: string }>();
      if (!row) return null;
      return JSON.parse(row.value) as T;
    } catch {
      return null;
    }
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
    const likePrefix = prefix.replace(/%/g, '\\%') + '%';

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

// D1 初始化 SQL（内嵌，避免运行时 import ?raw）
const D1_INIT_SQL = `
CREATE TABLE IF NOT EXISTS kv (
    id          TEXT PRIMARY KEY,
    category    TEXT NOT NULL,
    value       TEXT NOT NULL,
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    expires_at  INTEGER,
    key_path    TEXT,
    time_ms     INTEGER,
    ip          TEXT,
    label       TEXT
)
`;

const D1_INIT_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_kv_category       ON kv(category)',
  'CREATE INDEX IF NOT EXISTS idx_kv_category_time  ON kv(category, time_ms DESC)',
  'CREATE INDEX IF NOT EXISTS idx_kv_category_key   ON kv(category, key_path)',
  'CREATE INDEX IF NOT EXISTS idx_kv_expires        ON kv(expires_at) WHERE expires_at IS NOT NULL',
  'CREATE INDEX IF NOT EXISTS idx_kv_label          ON kv(label) WHERE label IS NOT NULL',
];

let initPromise: Promise<void> | null = null;

export async function ensureD1Schema(env: Env): Promise<void> {
  if (!env.META_DB) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const table = await env.META_DB!
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='kv'")
        .first();
      if (!table) {
        await env.META_DB!.exec(D1_INIT_SQL);
        for (const idx of D1_INIT_INDEXES) {
          await env.META_DB!.exec(idx);
        }
      }
    } catch (e) {
      console.error('D1 schema init failed:', e);
      initPromise = null;
      throw e;
    }
  })();

  return initPromise;
}
