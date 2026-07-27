-- Migration 003: Add 'archived' status to mods table
-- Run against production MySQL:
--   mysql -h host -u user -p catarsys < backend/migrations/003_add_archived_status.sql

ALTER TABLE mods
MODIFY COLUMN status ENUM('draft','pending','approved','rejected','banned','archived','deleted') NOT NULL DEFAULT 'draft';