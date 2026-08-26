-- 004 — Road register cache (2026-08-12)
--
-- Adds road_register: a MySQL copy of data/lmc-ward-road-details.csv (the
-- per-road sanitation/engineering/utility contact register), so request-time
-- code (pages/api/road-lookup.ts, pages/api/division-stats.ts,
-- pages/lucknow-road-data.tsx, pages/main/[slug].tsx, and
-- lib/officials.ts's buildFromRoadRegister()) reads from MySQL instead of
-- re-parsing the 8MB CSV on every cold start/request. Unlike
-- officials_contacts, this is a straight row-for-row copy of the CSV — no
-- merging/aggregation happens at import time, so every column keeps its raw
-- source format (phone cells stay JSON-array-encoded strings, multi-person
-- cells stay newline-separated) exactly as lib/officials.ts's splitNames()/
-- parsePhones() already expect.
--
-- The source file is static (committed to the repo, not fetched from a live
-- API), so unlike osm_*/officials_* there's no scheduled refresh — just a
-- one-time (rerunnable) `npm run import:road-register`.
--
-- Apply by hand against an existing volume:
--
--   docker exec -i lmc-db-1 mysql -uroot -p"$DB_PASSWORD" lmc \
--     < database/migrations/004_road_register_cache.sql
--
-- Safe to re-run: every statement is guarded, so applying it twice is a no-op.

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

-- Run once to warm the table after applying this migration:
--   npm run import:road-register
-- Until that runs, getRoadRegister() finds road_register empty and falls
-- back to the same live CSV parse it always did — nothing breaks in the
-- meantime.

-- Rollback (source of truth stays the committed CSV, so this is safe to
-- drop and rebuild any time via the import script above):
--   DROP TABLE IF EXISTS road_register;
