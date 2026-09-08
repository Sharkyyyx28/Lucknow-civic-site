-- Lucknow civic data — database schema
-- (the database is still named `lmc`; renaming it would orphan the MySQL volume)
--
-- This is the full, current shape of the database. Whether it runs
-- automatically depends on where the database lives:
--
-- - A local `mysql:8.0` container (e.g. if you spin one up for testing)
--   auto-runs this on a FRESH volume only, via docker-entrypoint-initdb.d.
-- - Production and the shared dev/staging database do NOT get that
--   treatment — production has no container of ours at all (see
--   DEPLOYMENT.md), and the shared dev/staging database is external too (see
--   docker-compose.yaml's header) — so it has to be run explicitly once, via
--   `npm run db:bootstrap` (scripts/migrate.ts).
--
-- Either way, an already-running database with data in it never sees
-- changes made here again — so every change must ALSO land as a file in
-- database/migrations/, which is what gets applied to existing databases.
-- See database/migrations/README.md.

CREATE DATABASE IF NOT EXISTS lmc;
USE lmc;

-- Users table (keyed by the sign-in email from NextAuth's Google provider)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);

-- Saved locations (labeled wards, e.g. "Home"/"Office"), optionally pinned
-- to an exact point within the ward.
CREATE TABLE IF NOT EXISTS user_locations (
  id VARCHAR(36) PRIMARY KEY,
  user_id INT NOT NULL,
  label VARCHAR(50) NOT NULL,
  ward_name VARCHAR(255) NOT NULL,
  lat DOUBLE NULL,
  lng DOUBLE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);

-- Cached OpenStreetMap points (civic amenities + addr:postcode nodes),
-- refreshed periodically by scripts/refresh-osm.ts so request-time code
-- (lib/amenities.ts, lib/postcodes.ts) reads from MySQL instead of waiting on
-- the public Overpass API. osm_type+osm_id is the natural OSM key — node and
-- way ids are independent namespaces, so either alone can collide.
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

-- Community posts: a short write-up ("this park is well kept", "this road
-- needs repair") pinned to an exact point. ward_name/corporation are resolved
-- server-side from lat/lng at write time (lib/wardLookup.ts) and denormalized
-- here so the feed can filter by ward or corporation with a plain index scan
-- instead of a point-in-polygon test per post.
-- Officials directory cache: the merged output of lib/officials.ts (road
-- register + OpenCity MLAs/forest wing, see that file's header), refreshed
-- periodically by scripts/refresh-officials.ts so request-time code
-- (pages/officials.tsx, pages/api/officials.ts) reads from MySQL instead of
-- re-parsing the 8MB road-register CSV and re-fetching OpenCity on every
-- cold start.
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

-- Singleton row: the directory's ward list (for the ward filter) and its
-- `coverage` summary (per-source freshness/reach, used by the "Before you
-- dial" block) — both cheap to keep as one JSON blob each rather than
-- reconstructing them from officials_contacts on every read.
CREATE TABLE IF NOT EXISTS officials_meta (
  id TINYINT PRIMARY KEY DEFAULT 1,
  wards JSON NOT NULL,
  coverage JSON NOT NULL,
  refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- One row per run of scripts/refresh-officials.ts (scheduled or manual) —
-- an append-only audit trail so a run can be confirmed after the fact via
-- `SELECT * FROM officials_refresh_log ORDER BY refreshed_at DESC LIMIT 5`,
-- the same way osm_refresh_log already lets scripts/refresh-osm.ts runs be
-- confirmed. mlas_live/forest_live record whether that run reached OpenCity
-- or fell back to the committed CSV snapshot.
CREATE TABLE IF NOT EXISTS officials_refresh_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_count INT NOT NULL,
  mlas_live BOOLEAN NOT NULL,
  forest_live BOOLEAN NOT NULL,
  refreshed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Legacy BBMP road register schema (deprecated in Lucknow):
-- Kept only for migration backward compatibility. Lucknow municipal services
-- do not use this table (Lucknow uses Jal Sansthan for water and MVVNL/LESA
-- for power, rather than BWSSB/BESCOM).
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

-- Legacy pincode/ward mapping cache (deprecated in Lucknow):
-- Kept for schema migration compatibility. Point lookups in Lucknow are resolved
-- via turf point-in-polygon against actual 110-ward geometry (lib/wardLookup.ts).
CREATE TABLE IF NOT EXISTS pincode_ward_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pincode VARCHAR(10) NOT NULL DEFAULT '',
  ward_no VARCHAR(20) NOT NULL DEFAULT '',
  ward_name VARCHAR(255) NOT NULL DEFAULT '',
  district VARCHAR(100) NOT NULL DEFAULT '',
  INDEX idx_pincode (pincode),
  INDEX idx_ward_name (ward_name)
);

-- Social handles directory (X/Instagram/website for NGOs, civic voices, media
-- and government accounts working on Lucknow) and the admins allowed to
-- edit it — see lib/socialHandles.ts and lib/admin.ts. `admins` only holds
-- DB-granted admins; accounts listed in the ADMIN_EMAILS env var are
-- permanent and never appear as a row here (see lib/admin.ts).
CREATE TABLE IF NOT EXISTS social_handles (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category ENUM('official', 'ngo', 'individual', 'media') NOT NULL,
  role VARCHAR(255) NOT NULL DEFAULT '',
  focus TEXT NOT NULL,
  x_handle VARCHAR(100) NOT NULL DEFAULT '',
  x_status ENUM('unchecked', 'ok', 'not_found', 'unknown') NOT NULL DEFAULT 'unchecked',
  instagram_handle VARCHAR(100) NOT NULL DEFAULT '',
  instagram_status ENUM('unchecked', 'ok', 'not_found', 'unknown') NOT NULL DEFAULT 'unchecked',
  website VARCHAR(500) NOT NULL DEFAULT '',
  website_status ENUM('unchecked', 'ok', 'not_found', 'unknown') NOT NULL DEFAULT 'unchecked',
  checked_at TIMESTAMP NULL DEFAULT NULL,
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
