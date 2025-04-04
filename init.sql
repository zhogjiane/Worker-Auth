-- 初始化数据库表结构

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  bio TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'subscriber', 'admin')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- IP记录表
CREATE TABLE IF NOT EXISTS ip_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  request_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason TEXT,
  ban_expires_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ip_address ON ip_records(ip_address);
CREATE INDEX IF NOT EXISTS idx_request_time ON ip_records(request_time);
CREATE INDEX IF NOT EXISTS idx_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_role ON users(role);

-- 创建触发器，自动更新updated_at字段
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_ip_records_timestamp 
AFTER UPDATE ON ip_records
BEGIN
  UPDATE ip_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 插入测试数据（可选）
-- 注意：实际生产环境中应该使用加密后的密码
INSERT OR IGNORE INTO users (email, password, name, bio, role, created_at, updated_at)
VALUES 
  ('admin@example.com', 'admin123', '管理员', '系统管理员', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('subscriber@example.com', 'subscriber123', '订阅用户', '这是一个订阅用户', 'subscriber', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user@example.com', 'user123', '普通用户', '这是一个普通用户', 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 插入测试IP记录（可选）
INSERT OR IGNORE INTO ip_records (ip_address, request_time, is_banned, created_at, updated_at)
VALUES 
  ('127.0.0.1', CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('192.168.1.1', CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP); 