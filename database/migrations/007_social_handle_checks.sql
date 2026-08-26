-- 007 — Social handle existence checks (2026-08-18)
--
-- Adds per-platform check status + a shared last-checked timestamp to
-- social_handles, behind the "Check" / "Check all" buttons on
-- /admin/social-handles (lib/socialHandleCheck.ts does the actual HTTP
-- probing; lib/socialHandles.ts persists the result). Also runs
-- automatically whenever a handle is created or updated — see
-- pages/api/social-handles/index.ts and [id].ts.
--
-- Status values: 'unchecked' (default — never probed, or the field is
-- blank), 'ok' (2xx response), 'not_found' (explicit 404), 'unknown'
-- (anything else — timeout, 403/429 challenge, 5xx). X and Instagram in
-- particular can 200 an empty SPA shell regardless of whether the handle
-- exists, so 'ok' there is a soft signal, not a guarantee — see
-- lib/socialHandleCheck.ts for the full caveat.
--
-- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (the shorthand every other
-- guarded statement in this repo uses) is a MariaDB extension, not real
-- MySQL — MySQL 8.0 (confirmed against 8.0.46) rejects it outright. Real
-- MySQL only supports `IF [NOT] EXISTS` on a handful of ALTER TABLE clauses
-- (indexes, partitions), not ADD COLUMN. So each column below is guarded
-- the portable way instead: check INFORMATION_SCHEMA.COLUMNS, build the ALTER
-- as a string, and PREPARE/EXECUTE it only if the column is missing. Every
-- statement here is a plain top-level statement (no BEGIN/END, no stored
-- procedure), so it runs unmodified through both `scripts/migrate.ts`
-- (mysql2, multipleStatements) and the plain `mysql` CLI below — no
-- DELIMITER dance needed.
--
-- Apply by hand against an existing volume:
--
--   docker exec -i lmc-db-1 mysql -uroot -p"$DB_PASSWORD" lmc \
--     < database/migrations/007_social_handle_checks.sql
--
-- Safe to re-run: every ALTER is guarded, so applying it twice is a no-op.
--
-- No `USE <db>` here on purpose — the target database is named on the mysql
-- command line above, so this applies wherever DB_NAME happens to point.

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'social_handles' AND COLUMN_NAME = 'x_status'
);
SET @ddl := IF(@col_exists = 0,
  "ALTER TABLE social_handles ADD COLUMN x_status ENUM('unchecked', 'ok', 'not_found', 'unknown') NOT NULL DEFAULT 'unchecked' AFTER x_handle",
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'social_handles' AND COLUMN_NAME = 'instagram_status'
);
SET @ddl := IF(@col_exists = 0,
  "ALTER TABLE social_handles ADD COLUMN instagram_status ENUM('unchecked', 'ok', 'not_found', 'unknown') NOT NULL DEFAULT 'unchecked' AFTER instagram_handle",
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'social_handles' AND COLUMN_NAME = 'website_status'
);
SET @ddl := IF(@col_exists = 0,
  "ALTER TABLE social_handles ADD COLUMN website_status ENUM('unchecked', 'ok', 'not_found', 'unknown') NOT NULL DEFAULT 'unchecked' AFTER website",
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'social_handles' AND COLUMN_NAME = 'checked_at'
);
SET @ddl := IF(@col_exists = 0,
  'ALTER TABLE social_handles ADD COLUMN checked_at TIMESTAMP NULL DEFAULT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rollback:
--   ALTER TABLE social_handles
--     DROP COLUMN x_status, DROP COLUMN instagram_status,
--     DROP COLUMN website_status, DROP COLUMN checked_at;
