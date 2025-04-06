-- 删除现有表（如果存在）
DROP TABLE IF EXISTS comment_reports;
DROP TABLE IF EXISTS comment_votes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS verification_codes;
DROP TABLE IF EXISTS users;

-- 创建用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    invite_code TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending'
);

-- 创建角色表
CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建权限表
CREATE TABLE permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建用户角色关联表
CREATE TABLE user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- 创建角色权限关联表
CREATE TABLE role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 创建验证码表
CREATE TABLE verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    created_by INTEGER,
    used_by INTEGER,
    is_used INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    used_at INTEGER,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 创建文章表
CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    is_premium BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建评论表
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    article_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    report_count INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 创建评论投票表
CREATE TABLE comment_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    vote_type TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 创建评论举报表
CREATE TABLE comment_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    comment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verification_status ON users(verification_status);
CREATE INDEX idx_articles_author_id ON articles(author_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_created_at ON articles(created_at);
CREATE INDEX idx_comments_article_id ON comments(article_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE INDEX idx_comment_votes_comment_id ON comment_votes(comment_id);
CREATE INDEX idx_comment_votes_user_id ON comment_votes(user_id);
CREATE INDEX idx_comment_reports_comment_id ON comment_reports(comment_id);
CREATE INDEX idx_comment_reports_user_id ON comment_reports(user_id);

-- 插入默认角色
INSERT INTO roles (name, description) VALUES
('ADMIN', '系统管理员，拥有所有权限'),
('USER', '普通用户，可以查看免费文章和评论'),
('MODERATOR', '内容管理员，可以管理文章和评论'),
('EDITOR', '编辑，可以创建和编辑文章');

-- 插入默认权限
INSERT INTO permissions (name, description) VALUES
('user:manage', '用户管理权限'),
('role:manage', '角色管理权限'),
('permission:manage', '权限管理权限'),
('article:create', '创建文章权限'),
('article:edit', '编辑文章权限'),
('article:delete', '删除文章权限'),
('article:view:free', '查看免费文章权限'),
('article:view:premium', '查看付费文章权限'),
('comment:create', '创建评论权限'),
('comment:edit', '编辑评论权限'),
('comment:delete', '删除评论权限'),
('comment:view:free', '查看免费文章评论权限'),
('comment:view:premium', '查看付费文章评论权限'),
('verification:manage', '验证码管理权限');

-- 为角色分配权限
-- ADMIN 角色拥有所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'ADMIN'),
    id
FROM permissions;

-- USER 角色拥有基本权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'USER'),
    id
FROM permissions
WHERE name IN (
    'article:view:free',
    'comment:create',
    'comment:edit',
    'comment:delete',
    'comment:view:free'
);

-- MODERATOR 角色拥有内容管理权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'MODERATOR'),
    id
FROM permissions
WHERE name IN (
    'article:view:free',
    'article:view:premium',
    'article:edit',
    'article:delete',
    'comment:view:free',
    'comment:view:premium',
    'comment:edit',
    'comment:delete'
);

-- EDITOR 角色拥有文章编辑权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'EDITOR'),
    id
FROM permissions
WHERE name IN (
    'article:create',
    'article:edit',
    'article:view:free',
    'article:view:premium',
    'comment:view:free',
    'comment:view:premium',
    'comment:create',
    'comment:edit'
);

-- 创建默认管理员用户
INSERT INTO users (
    email,
    username,
    password_hash,
    role,
    verification_status,
    is_active
) VALUES (
    'admin@example.com',
    'admin',
    '$2a$10$rPQcLj1Cz1Cz1Cz1Cz1Cz1Cz1Cz1Cz1Cz1Cz1Cz1Cz1Cz1Cz1C', -- 密码: admin123
    'ADMIN',
    'verified',
    1
);

-- 为管理员用户分配角色
INSERT INTO user_roles (user_id, role_id)
SELECT 
    (SELECT id FROM users WHERE email = 'admin@example.com'),
    (SELECT id FROM roles WHERE name = 'ADMIN');

-- 创建示例验证码
INSERT INTO verification_codes (
    code,
    type,
    created_by,
    expires_at
) VALUES (
    'INVITE123',
    'INVITATION',
    (SELECT id FROM users WHERE email = 'admin@example.com'),
    unixepoch() + 365 * 24 * 60 * 60 -- 1年后过期
);

-- 创建示例文章
INSERT INTO articles (
    title,
    content,
    author_id,
    status,
    is_premium,
    published_at
) VALUES 
(
    '免费示例文章',
    '这是一篇免费的文章内容...',
    (SELECT id FROM users WHERE email = 'admin@example.com'),
    'published',
    0,
    unixepoch()
),
(
    '付费示例文章',
    '这是一篇付费的文章内容...',
    (SELECT id FROM users WHERE email = 'admin@example.com'),
    'published',
    1,
    unixepoch()
); 