-- 初始化数据库表结构

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- IP记录表
CREATE TABLE IF NOT EXISTS ip_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  request_time TEXT NOT NULL DEFAULT (datetime('now')),
  is_banned INTEGER NOT NULL DEFAULT 0,
  ban_reason TEXT,
  ban_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_ip_records_ip_address ON ip_records(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_records_request_time ON ip_records(request_time);
CREATE INDEX IF NOT EXISTS idx_ip_records_is_banned ON ip_records(is_banned);

-- 插入初始管理员用户（密码为 'admin123' 的哈希值）
-- 注意：实际部署时应更改此密码
INSERT OR IGNORE INTO users (email, password, name, role)
VALUES (
  'admin@litesmile.xyz',
  '$2a$10$X7UrE9N9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9Zq',
  '管理员',
  'admin'
);

-- 插入测试数据（可选）
-- 注意：实际生产环境中应该使用加密后的密码
INSERT OR IGNORE INTO users (email, password, name, bio, role)
VALUES 
  ('admin@example.com', '$2a$10$X7UrE9N9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9Zq', '管理员', '系统管理员', 'admin'),
  ('subscriber@example.com', '$2a$10$X7UrE9N9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9Zq', '订阅用户', '这是一个订阅用户', 'subscriber'),
  ('user@example.com', '$2a$10$X7UrE9N9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9ZqX9Zq', '普通用户', '这是一个普通用户', 'user');

-- 插入测试IP记录（可选）
INSERT OR IGNORE INTO ip_records (ip_address, is_banned)
VALUES 
  ('127.0.0.1', 0),
  ('192.168.1.1', 0); 