-- 006 — Social handles directory + admins (2026-08-15)
--
-- Adds the tables behind lib/socialHandles.ts (the /social-handles directory,
-- moved off a hardcoded array) and lib/admin.ts (who can edit it). Mirrors
-- 003_officials_cache.sql's approach.
--
-- `admins` only holds DB-granted admins — accounts listed in the ADMIN_EMAILS
-- env var are permanent and never appear as a row here, so the table can be
-- emptied without locking everyone out. See lib/admin.ts.
--
-- Apply by hand against an existing volume:
--
--   docker exec -i lmc-db-1 mysql -uroot -p"$DB_PASSWORD" lmc \
--     < database/migrations/006_social_handles.sql
--
-- Safe to re-run: every statement is guarded, so applying it twice is a no-op.
--
-- No `USE <db>` here on purpose — the target database is named on the mysql
-- command line above, so this applies wherever DB_NAME happens to point.

CREATE TABLE IF NOT EXISTS social_handles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category ENUM('official', 'ngo', 'individual', 'media') NOT NULL,
  role VARCHAR(255) NOT NULL DEFAULT '',
  focus TEXT NOT NULL,
  x_handle VARCHAR(100) NOT NULL DEFAULT '',
  instagram_handle VARCHAR(100) NOT NULL DEFAULT '',
  website VARCHAR(500) NOT NULL DEFAULT '',
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category)
);

CREATE TABLE IF NOT EXISTS admins (
  email VARCHAR(255) PRIMARY KEY,
  added_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Run once to move the 22 curated entries from lib/socialHandles.ts into the
-- table after applying this migration:
--   npm run seed:social-handles
-- Until that runs, listSocialHandles() finds social_handles empty and the
-- public page renders zero entries — set ADMIN_EMAILS and seed promptly.

-- Rollback:
--   DROP TABLE IF EXISTS admins;
--   DROP TABLE IF EXISTS social_handles;
