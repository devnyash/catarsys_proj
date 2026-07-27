-- Migration: Create admin_audit_log table
-- Run against production MySQL: mysql -h host -u user -p catarsys < 001_admin_audit_log.sql

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL,
    admin_username VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id INT,
    target_username VARCHAR(255),
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_admin_audit_created (created_at DESC),
    INDEX idx_admin_audit_action (action),
    INDEX idx_admin_audit_admin (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
