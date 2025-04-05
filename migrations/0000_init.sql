-- Migration number: 0000 	 2024-04-04T06:02:16.002Z
-- Description: Initial database setup

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    invite_code TEXT,
    verification_status TEXT DEFAULT 'PENDING'
);

-- 创建角色表
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建权限表
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户-角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE(user_id, role_id)
);

-- 创建角色-权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- 创建验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,         -- 'INVITATION', 'UPGRADE', 等
    created_by INTEGER,         -- 谁创建了这个验证码
    used_by INTEGER,            -- 谁使用了这个验证码
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP,
    expires_at TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (used_by) REFERENCES users(id)
);

-- 创建文章表
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    view_count INTEGER DEFAULT 0,
    FOREIGN KEY (author_id) REFERENCES users(id)
);

-- 创建文章分类表
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建文章-分类关联表
CREATE TABLE IF NOT EXISTS article_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(article_id, category_id)
);

-- 创建标签表
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建文章-标签关联表
CREATE TABLE IF NOT EXISTS article_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(article_id, tag_id)
);

-- 创建评论表
CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    article_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- 创建评论投票表
CREATE TABLE IF NOT EXISTS comment_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    vote_type TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (vote_type IN ('UP', 'DOWN')),
    UNIQUE (comment_id, user_id)
);

-- 创建评论举报表
CREATE TABLE IF NOT EXISTS comment_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    reporter_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (reason IN ('SPAM', 'ABUSE', 'OFFENSIVE', 'OTHER'))
);

-- 创建用户活动日志表
CREATE TABLE IF NOT EXISTS user_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity_type TEXT NOT NULL, -- 'LOGIN', 'COMMENT', 'ARTICLE_VIEW', etc.
    entity_type TEXT,            -- 'ARTICLE', 'COMMENT', etc.
    entity_id INTEGER,           -- ID of the related entity
    details TEXT,                -- Additional JSON details
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 创建 IP 记录表
CREATE TABLE IF NOT EXISTS ip_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_banned INTEGER DEFAULT 0,
    ban_reason TEXT,
    ban_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_type ON verification_codes(type);
CREATE INDEX IF NOT EXISTS idx_verification_codes_is_used ON verification_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_entity_type ON user_activities(entity_type);
CREATE INDEX IF NOT EXISTS idx_ip_records_ip_address ON ip_records(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_records_is_banned ON ip_records(is_banned);
CREATE INDEX IF NOT EXISTS idx_ip_records_ban_expires_at ON ip_records(ban_expires_at);
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment_id ON comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id ON comment_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_comment_id ON comment_reports(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reports_reporter_id ON comment_reports(reporter_id);

-- 插入基础角色
INSERT INTO roles (name, description) VALUES 
('ADMIN', '系统管理员，拥有全部权限'),
('PAID_USER', '付费用户，拥有扩展权限'),
('REGULAR_USER', '普通用户，拥有基本权限'),
('GUEST', '未认证用户，权限受限');

-- 插入基础权限
INSERT INTO permissions (name, description) VALUES 
('CREATE_ARTICLE', '创建文章'),
('EDIT_ARTICLE', '编辑自己的文章'),
('DELETE_ARTICLE', '删除自己的文章'),
('PUBLISH_ARTICLE', '发布文章'),
('CREATE_COMMENT', '创建评论'),
('EDIT_COMMENT', '编辑自己的评论'),
('DELETE_COMMENT', '删除自己的评论'),
('MODERATE_COMMENTS', '管理所有评论'),
('EDIT_ANY_ARTICLE', '编辑任何文章'),
('DELETE_ANY_ARTICLE', '删除任何文章'),
('CREATE_INVITATION', '创建邀请码'),
('VIEW_PREMIUM_CONTENT', '查看高级内容'),
('MANAGE_USERS', '管理用户'),
('MANAGE_ROLES', '管理角色'),
('MANAGE_PERMISSIONS', '管理权限');

-- 角色-权限映射
-- 管理员权限
INSERT INTO role_permissions (role_id, permission_id) 
SELECT (SELECT id FROM roles WHERE name = 'ADMIN'), id FROM permissions;

-- 付费用户权限
INSERT INTO role_permissions (role_id, permission_id) 
SELECT (SELECT id FROM roles WHERE name = 'PAID_USER'), id FROM permissions 
WHERE name IN ('CREATE_ARTICLE', 'EDIT_ARTICLE', 'DELETE_ARTICLE', 'PUBLISH_ARTICLE',
              'CREATE_COMMENT', 'EDIT_COMMENT', 'DELETE_COMMENT', 'VIEW_PREMIUM_CONTENT');

-- 普通用户权限
INSERT INTO role_permissions (role_id, permission_id) 
SELECT (SELECT id FROM roles WHERE name = 'REGULAR_USER'), id FROM permissions 
WHERE name IN ('CREATE_ARTICLE', 'EDIT_ARTICLE', 'DELETE_ARTICLE',
              'CREATE_COMMENT', 'EDIT_COMMENT', 'DELETE_COMMENT');

-- 游客权限
INSERT INTO role_permissions (role_id, permission_id) 
SELECT (SELECT id FROM roles WHERE name = 'GUEST'), id FROM permissions 
WHERE name IN ('CREATE_COMMENT');

-- 创建默认管理员账户
INSERT INTO users (username, email, password_hash, verification_status) 
VALUES (
    'liteSmile',
    'admin@example.com',
    -- 使用 scrypt 算法生成的密码哈希值，密码为 'liteSmile'
    '$scrypt$N=32768,r=8,p=1,maxmem=67108864$X4Y7Z8A9B0C1D2E3F4G5H6I7J8K9L0M1N2O3P4Q5R6S7T8U9V0W1X2Y3Z4$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/',
    'VERIFIED'
);

-- 分配管理员角色
INSERT INTO user_roles (user_id, role_id)
SELECT 
    (SELECT id FROM users WHERE username = 'liteSmile'),
    (SELECT id FROM roles WHERE name = 'ADMIN');

-- 创建初始验证码
INSERT INTO verification_codes (code, type, created_by, expires_at)
SELECT 
    'INVITE123',
    'INVITATION',
    (SELECT id FROM users WHERE username = 'liteSmile'),
    datetime('now', '+30 days')
UNION ALL
SELECT 
    'INVITE456',
    'INVITATION',
    (SELECT id FROM users WHERE username = 'liteSmile'),
    datetime('now', '+30 days')
UNION ALL
SELECT 
    'UPGRADE789',
    'UPGRADE',
    (SELECT id FROM users WHERE username = 'liteSmile'),
    datetime('now', '+30 days');

-- 创建默认分类
INSERT INTO categories (name, description) VALUES
('技术', '技术相关文章'),
('生活', '生活相关文章'),
('教程', '教程类文章'),
('新闻', '新闻资讯');

-- 创建默认标签
INSERT INTO tags (name) VALUES
('JavaScript'),
('TypeScript'),
('Node.js'),
('Cloudflare'),
('Web开发'),
('数据库'),
('安全'),
('性能优化'); 