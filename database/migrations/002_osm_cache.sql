-- 002 — OSM amenity/postcode cache (2026-07-28)
--
-- Adds the tables behind lib/amenities.ts and lib/postcodes.ts: a local cache
-- of OpenStreetMap points, refreshed periodically by scripts/refresh-osm.ts so
-- request-time code reads from MySQL instead of waiting on the public
-- Overpass API.
--
-- These landed in database/schema.sql back in commit dcbd347 but never got a
-- migration file, so any database volume initialised before that commit
-- never picked them up — schema.sql only runs on a *fresh* volume. Apply by
-- hand against an existing one:
--
--   docker exec -i lmc-db-1 mysql -uroot -p"$DB_PASSWORD" lmc \
--     < database/migrations/002_osm_cache.sql
--
-- Safe to re-run: every statement is guarded, so applying it twice is a no-op.
--
-- No `USE <db>` here on purpose — the target database is named on the mysql
-- command line above, so this applies wherever DB_NAME happens to point.

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

-- Rollback (destroys the cache — deliberately not part of the migration;
-- scripts/refresh-osm.ts repopulates it from Overpass on next run):
--   DROP TABLE IF EXISTS osm_refresh_log;
--   DROP TABLE IF EXISTS osm_postcode_points;
--   DROP TABLE IF EXISTS osm_amenities;
