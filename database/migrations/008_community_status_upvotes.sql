-- 008 — Community post status and upvotes (2026-09-28)
--
-- Adds civic status tracking ('reported', 'in_progress', 'resolved') and an upvote
-- counter to community_posts, enabling residents to monitor resolution and endorse
-- critical civic issues across Lucknow wards.

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
