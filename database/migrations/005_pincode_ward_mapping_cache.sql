-- 005 — Pincode/ward mapping cache (2026-08-12)
--
-- Adds pincode_ward_mapping: a MySQL copy of
-- data/banglore-pincode-to-ward-mapping.csv, so request-time code
-- (pages/api/ward-lookup.ts, pages/api/corporation-stats.ts,
-- pages/pincode-wardid-lookup.tsx, lib/wardPincodes.ts) reads from MySQL
-- instead of re-parsing the CSV on every cold start/request. A pincode maps
-- to more than one ward (old ~198-ward KGIS numbering), so there's no
-- natural single-column key — a surrogate id is used instead, same as
-- community_posts/user_locations.
--
-- The source file is static (committed to the repo, not fetched from a live
-- API), so unlike osm_*/officials_* there's no scheduled refresh — just a
-- one-time (rerunnable) `npm run import:pincode-ward-mapping`.
--
-- Apply by hand against an existing volume:
--
--   docker exec -i lmc-db-1 mysql -uroot -p"$DB_PASSWORD" lmc \
--     < database/migrations/005_pincode_ward_mapping_cache.sql
--
-- Safe to re-run: every statement is guarded, so applying it twice is a no-op.

CREATE TABLE IF NOT EXISTS pincode_ward_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pincode VARCHAR(10) NOT NULL DEFAULT '',
  ward_no VARCHAR(20) NOT NULL DEFAULT '',
  ward_name VARCHAR(255) NOT NULL DEFAULT '',
  district VARCHAR(100) NOT NULL DEFAULT '',
  INDEX idx_pincode (pincode),
  INDEX idx_ward_name (ward_name)
);

-- Run once to warm the table after applying this migration:
--   npm run import:pincode-ward-mapping
-- Until that runs, getPincodeWardMapping() finds pincode_ward_mapping empty
-- and falls back to the same live CSV parse it always did — nothing breaks
-- in the meantime.

-- Rollback (source of truth stays the committed CSV, so this is safe to
-- drop and rebuild any time via the import script above):
--   DROP TABLE IF EXISTS pincode_ward_mapping;
