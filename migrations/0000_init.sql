-- Migration number: 0000 	 2024-04-04T06:02:16.002Z
-- Description: Initial database setup

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    bio TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建 IP 记录表
CREATE TABLE IF NOT EXISTS ip_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    request_time TEXT DEFAULT CURRENT_TIMESTAMP,
    is_banned INTEGER DEFAULT 0,
    ban_reason TEXT,
    ban_expires_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ip_address ON ip_records(ip_address);
CREATE INDEX IF NOT EXISTS idx_is_banned ON ip_records(is_banned);
CREATE INDEX IF NOT EXISTS idx_ban_expires_at ON ip_records(ban_expires_at); 