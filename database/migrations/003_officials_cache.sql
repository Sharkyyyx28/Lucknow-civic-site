-- 003 — Officials directory cache (2026-08-11)
--
-- Adds the tables behind lib/officials.ts: a MySQL cache of the merged
-- officials directory (road register + OpenCity MLAs/forest wing), refreshed
-- periodically by scripts/refresh-officials.ts so request-time code
-- (pages/officials.tsx, pages/api/officials.ts) reads from MySQL instead of
-- re-parsing the 8MB road-register CSV and re-fetching OpenCity on every
-- cold start. Mirrors 002_osm_cache.sql's approach for OSM data.
--
-- Apply by hand against an existing volume:
--
--   docker exec -i lmc-db-1 mysql -uroot -p"$DB_PASSWORD" lmc \
--     < database/migrations/003_officials_cache.sql
--
-- Safe to re-run: every statement is guarded, so applying it twice is a no-op.
--
-- No `USE <db>` here on purpose — the target database is named on the mysql
-- command line above, so this applies wherever DB_NAME happens to point.

CREATE TABLE IF NOT EXISTS officials_contacts (
  id VARCHAR(191) PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  designation VARCHAR(255) NULL,
  phones JSON NOT NULL,
  email VARCHAR(255) NULL,
  wards JSON NOT NULL,
  coverage_label VARCHAR(500) NOT NULL,
  roads INT NOT NULL DEFAULT 0,
  INDEX idx_role (role),
  INDEX idx_source (source)
);

CREATE TABLE IF NOT EXISTS officials_meta (
  id TINYINT PRIMARY KEY DEFAULT 1,
  wards JSON NOT NULL,
  coverage JSON NOT NULL,
  refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- One row per run of scripts/refresh-officials.ts (scheduled or manual) — an
-- append-only audit trail so a run can be confirmed after the fact, the same
-- way osm_refresh_log already lets refresh-osm.ts runs be confirmed:
--
--   docker exec -i lmc-db-1 mysql -uroot -p"$DB_PASSWORD" lmc \
--     -e "SELECT * FROM officials_refresh_log ORDER BY refreshed_at DESC LIMIT 5;"
--
-- mlas_live/forest_live record whether that run reached OpenCity or fell
-- back to the committed CSV snapshot.
CREATE TABLE IF NOT EXISTS officials_refresh_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_count INT NOT NULL,
  mlas_live BOOLEAN NOT NULL,
  forest_live BOOLEAN NOT NULL,
  refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Run once to warm the cache after applying this migration:
--   npm run refresh:officials
-- Until that runs, getOfficialsDirectory() finds officials_contacts empty and
-- falls back to the same live CSV/OpenCity build it always did — nothing
-- breaks in the meantime.

-- Rollback (destroys the cache — deliberately not part of the migration;
-- scripts/refresh-officials.ts repopulates it from source on next run):
--   DROP TABLE IF EXISTS officials_refresh_log;
--   DROP TABLE IF EXISTS officials_meta;
--   DROP TABLE IF EXISTS officials_contacts;
