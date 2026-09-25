-- migrate_all.sql — every migration in database/migrations/, concatenated
-- (2026-08-13)
--
-- Convenience file for bringing an EXISTING database up to the current
-- schema in one shot — e.g. a fresh production deploy where the volume
-- isn't brand new by the time you run this, or any box you don't want to
-- loop database/migrations/*.sql on by hand.
--
-- This does not replace the numbered files — it is generated from them.
-- Every statement here is idempotent (CREATE TABLE IF NOT EXISTS, guarded
-- ALTERs, …), same as the sources, so running this against a database that
-- already has some/all of these tables is a no-op for what's already there.
-- There is no tracking table, and none is needed at this size.
--
-- Going forward: when you add a new database/migrations/NNN_*.sql file,
-- append its statements to this file too (in the same order), and add a row
-- to the table in database/migrations/README.md. This file existing does
-- NOT remove the requirement to also update database/schema.sql (for fresh
-- volumes) and add the numbered migration (for the historical record) — see
-- database/migrations/README.md for the full three-places-to-update rule.
--
-- Usage (against the compose database, lmc-db-1):
--
--   DB_PASSWORD="$(docker exec lmc-db-1 printenv MYSQL_ROOT_PASSWORD)"
--   docker exec -i lmc-db-1 mysql -uroot -p"$DB_PASSWORD" lmc \
--     < database/migrations/migrate_all.sql
--
-- Against a database not in Docker, drop the `docker exec` prefix and point
-- mysql at DB_HOST/DB_PORT from your env file instead.
--
-- No `USE <db>` here on purpose — the target database is named on the mysql
-- command line above, so this applies wherever DB_NAME happens to point.

-- ============================================================
-- 001 — community posts (2026-07-28)
-- ============================================================

-- ward_name/corporation are resolved server-side from lat/lng at write time
-- (lib/wardLookup.ts) and denormalized here, so the feed can filter by ward or
-- corporation with a plain index scan instead of a point-in-polygon test per
-- post. user_id references the same `users` row as saved locations.
CREATE TABLE IF NOT EXISTS community_posts (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  category ENUM('issue', 'praise', 'update', 'question') NOT NULL DEFAULT 'issue',
  ward_name VARCHAR(255) NOT NULL,
  corporation VARCHAR(100) NOT NULL DEFAULT '',
  place_label VARCHAR(120) NOT NULL DEFAULT '',
  lat DOUBLE NOT NULL,
  lng DOUBLE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_ward_name (ward_name),
  INDEX idx_corporation (corporation),
  INDEX idx_created_at (created_at),
  INDEX idx_user_id (user_id)
);

-- ============================================================
-- 002 — OSM amenity/postcode cache (2026-07-28)
-- ============================================================

-- osm_type+osm_id is the natural OSM key — node and way ids are independent
-- namespaces, so either alone can collide.
CREATE TABLE IF NOT EXISTS osm_amenities (
  osm_type ENUM('node', 'way') NOT NULL,
  osm_id BIGINT NOT NULL,
  category ENUM('hospitals', 'parks', 'schools', 'safety') NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'Unnamed',
  lat DOUBLE NOT NULL,
  lon DOUBLE NOT NULL,
  PRIMARY KEY (osm_type, osm_id)
);

CREATE TABLE IF NOT EXISTS osm_postcode_points (
  osm_type ENUM('node', 'way') NOT NULL,
  osm_id BIGINT NOT NULL,
  postcode CHAR(6) NOT NULL,
  lat DOUBLE NOT NULL,
  lon DOUBLE NOT NULL,
  PRIMARY KEY (osm_type, osm_id),
  INDEX idx_postcode (postcode)
);

CREATE TABLE IF NOT EXISTS osm_refresh_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dataset VARCHAR(50) NOT NULL,
  row_count INT NOT NULL,
  refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 003 — Officials directory cache (2026-08-11)
-- ============================================================

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
-- append-only audit trail. mlas_live/forest_live record whether that run
-- reached OpenCity or fell back to the committed CSV snapshot.
CREATE TABLE IF NOT EXISTS officials_refresh_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_count INT NOT NULL,
  mlas_live BOOLEAN NOT NULL,
  forest_live BOOLEAN NOT NULL,
  refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 004 — Road register cache (2026-08-12)
-- ============================================================

-- Straight row-for-row copy of data/lmc-ward-road-details.csv — no
-- merging/aggregation happens at import time, so every column keeps its raw
-- source format (phone cells stay JSON-array-encoded strings, multi-person
-- cells stay newline-separated) exactly as lib/officials.ts's splitNames()/
-- parsePhones() expect.
CREATE TABLE IF NOT EXISTS road_register (
  id VARCHAR(20) PRIMARY KEY,
  road_id VARCHAR(50) NOT NULL DEFAULT '',
  master_wardname VARCHAR(255) NOT NULL DEFAULT '',
  zone VARCHAR(50) NOT NULL DEFAULT '',
  devision VARCHAR(100) NOT NULL DEFAULT '',
  ward_no VARCHAR(20) NOT NULL DEFAULT '',
  ward_name VARCHAR(255) NOT NULL DEFAULT '',
  road_name VARCHAR(500) NOT NULL DEFAULT '',
  road_length VARCHAR(50) NOT NULL DEFAULT '',
  roadunder_from VARCHAR(255) NOT NULL DEFAULT '',
  roadunder_to VARCHAR(255) NOT NULL DEFAULT '',
  sw_name TEXT,
  sw_supervisor TEXT,
  sw_supervisor_mob TEXT,
  sw_collect_time VARCHAR(100) NOT NULL DEFAULT '',
  sw_contractor TEXT,
  sw_contractor_mob TEXT,
  sw_household VARCHAR(50) NOT NULL DEFAULT '',
  sw_commercial VARCHAR(50) NOT NULL DEFAULT '',
  sw_bulkwaste VARCHAR(50) NOT NULL DEFAULT '',
  sw_segreegation VARCHAR(50) NOT NULL DEFAULT '',
  eng_name TEXT,
  eng_mob TEXT,
  contractor TEXT,
  contractor_mob TEXT,
  st_contractor TEXT,
  st_contractor_mob TEXT,
  stlight_contractor TEXT,
  stlight_contractor_mob TEXT,
  forest_rfo TEXT,
  forest_rfo_mob TEXT,
  bwssb TEXT,
  bwssb_mob TEXT,
  bescom_ae TEXT,
  bescom_ae_mob TEXT,
  control_room TEXT,
  control_room_mob TEXT,
  fire TEXT,
  fire_mob TEXT,
  animal TEXT,
  animal_mob TEXT,
  health TEXT,
  health_mob TEXT,
  mla_name TEXT,
  mla_mob TEXT,
  created_at VARCHAR(50) NOT NULL DEFAULT '',
  updated_at VARCHAR(50) NOT NULL DEFAULT '',
  INDEX idx_ward_no (ward_no),
  INDEX idx_ward_name (ward_name),
  INDEX idx_devision (devision)
);

-- ============================================================
-- 005 — Pincode/ward mapping cache (2026-08-12)
-- ============================================================

-- A pincode maps to more than one ward (old ~198-ward KGIS numbering), so
-- there's no natural single-column key — a surrogate id is used instead,
-- same as community_posts/user_locations.
CREATE TABLE IF NOT EXISTS pincode_ward_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pincode VARCHAR(10) NOT NULL DEFAULT '',
  ward_no VARCHAR(20) NOT NULL DEFAULT '',
  ward_name VARCHAR(255) NOT NULL DEFAULT '',
  district VARCHAR(100) NOT NULL DEFAULT '',
  INDEX idx_pincode (pincode),
  INDEX idx_ward_name (ward_name)
);

-- ============================================================
-- 006 — Social handles directory + admins (2026-08-15)
-- ============================================================

-- `admins` only holds DB-granted admins — accounts listed in the
-- ADMIN_EMAILS env var are permanent and never appear as a row here, so the
-- table can be emptied without locking everyone out. See lib/admin.ts.
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

-- ============================================================
-- 007 — Social handle existence checks (2026-08-18)
-- ============================================================

-- Per-platform check status + a shared last-checked timestamp, behind the
-- "Check" / "Check all" buttons on /admin/social-handles. Guarded via
-- INFORMATION_SCHEMA + PREPARE/EXECUTE rather than `ADD COLUMN IF NOT
-- EXISTS` — that shorthand is a MariaDB extension that real MySQL 8.0
-- rejects. See 007_social_handle_checks.sql for the full explanation.

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

-- ------------------------------------------------------------
-- 008 — Community post status and upvotes
-- ------------------------------------------------------------

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_posts' AND COLUMN_NAME = 'status'
);
SET @ddl := IF(@col_exists = 0,
  "ALTER TABLE community_posts ADD COLUMN status ENUM('reported', 'in_progress', 'resolved') NOT NULL DEFAULT 'reported' AFTER category",
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'community_posts' AND COLUMN_NAME = 'upvotes'
);
SET @ddl := IF(@col_exists = 0,
  "ALTER TABLE community_posts ADD COLUMN upvotes INT NOT NULL DEFAULT 0 AFTER place_label",
  'SELECT 1'
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- After running this file
-- ============================================================
--
-- Tables now exist but four of them are empty until you warm them —
-- `npm run seed:all` does the four cache tables in the right order in one go
-- (see package.json). Individually:
--
--   npm run import:road-register          -- road_register
--   npm run import:pincode-ward-mapping    -- pincode_ward_mapping
--   npm run refresh:officials              -- officials_contacts/officials_meta (depends on road_register above)
--   npm run refresh:osm                    -- osm_amenities/osm_postcode_points
--
-- Until each has run, request-time code falls back to its original live
-- CSV/Overpass/OpenCity source for that table's data — nothing breaks in
-- the meantime, pages are just slower until the cache is warm.
--
-- social_handles is different — there's no live source to fall back to, so
-- run this once, separately, right after migrating (set ADMIN_EMAILS first):
--
--   npm run seed:social-handles
