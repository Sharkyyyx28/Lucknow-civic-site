-- 001 — community posts (2026-07-28)
--
-- Adds the table behind /community: a short write-up pinned to a point, filed
-- under the ward and corporation that point falls in.
--
-- database/schema.sql only runs on a *fresh* MySQL volume (it is mounted into
-- docker-entrypoint-initdb.d), so an existing database with data in it needs
-- this applied by hand:
--
--   docker exec -i lmc-db-1 mysql -uroot -p"$DB_PASSWORD" lmc \
--     < database/migrations/001_community_posts.sql
--
-- Safe to re-run: every statement is guarded, so applying it twice is a no-op.
--
-- No `USE <db>` here on purpose — the target database is named on the mysql
-- command line above, so this applies wherever DB_NAME happens to point.

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

-- Rollback (destroys every post — deliberately not part of the migration):
--   DROP TABLE IF EXISTS community_posts;
