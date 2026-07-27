-- Migration 002: Add version column to mods table
-- Run against production MySQL:
--   mysql -h host -u user -p catarsys < backend/migrations/002_add_version_column.sql

ALTER TABLE mods
ADD COLUMN version VARCHAR(20) NOT NULL DEFAULT '';