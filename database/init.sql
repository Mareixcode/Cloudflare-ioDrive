-- ioDrive 元数据 D1 Schema
-- 单表 key-value 模式，替代 R2 JSON 文件存储

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
);

CREATE INDEX IF NOT EXISTS idx_kv_category       ON kv(category);
CREATE INDEX IF NOT EXISTS idx_kv_category_time  ON kv(category, time_ms DESC);
CREATE INDEX IF NOT EXISTS idx_kv_category_key   ON kv(category, key_path);
CREATE INDEX IF NOT EXISTS idx_kv_expires        ON kv(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kv_label          ON kv(label) WHERE label IS NOT NULL;

CREATE TRIGGER IF NOT EXISTS kv_updated_at
    AFTER UPDATE ON kv
BEGIN
    UPDATE kv SET updated_at = unixepoch() WHERE id = NEW.id;
END;
