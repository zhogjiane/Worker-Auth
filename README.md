# Worker-Auth

基于 Cloudflare Workers 和 D1 数据库构建的轻量级认证与授权服务，提供用户注册、登录、令牌刷新以及完整的角色权限管理功能。

## 项目概述

Worker-Auth 是一个专为现代 Web 应用设计的认证与授权服务，具有以下特点：

- **轻量级**: 基于 Cloudflare Workers 边缘计算，全球低延迟
- **高性能**: 利用 Cloudflare 的全球网络，提供快速响应
- **安全**: 内置 Cloudflare Turnstile 验证、密码哈希等安全机制
- **易集成**: 提供简洁的 RESTful API，易于前端集成
- **可扩展**: 模块化设计，易于添加新功能
- **完整授权**: 基于 RBAC (基于角色的访问控制) 的完整权限管理系统
- **博客功能**: 完整的博客系统，支持文章、分类、标签和评论

## 技术栈

- **运行时**: Cloudflare Workers
- **数据库**: Cloudflare D1 (SQLite)
- **Web 框架**: Hono.js
- **验证库**: Zod
- **JWT 库**: jose
- **人机验证**: Cloudflare Turnstile
- **开发工具**: Wrangler, TypeScript, esbuild
- **包管理器**: pnpm

## 系统架构

### 核心模块

- **认证模块**: 处理用户注册、登录、登出等认证操作
- **Turnstile 验证模块**: 集成 Cloudflare Turnstile 进行人机验证
- **授权模块**: 基于 RBAC 的角色和权限管理
- **错误处理模块**: 统一处理各类错误，提供友好的错误信息
- **数据库中间件**: 提供数据库连接和事务管理
- **安全中间件**: 处理 CORS、安全头等安全相关配置
- **博客模块**: 处理文章、分类、标签和评论的管理

### 数据流

1. 客户端发送请求到 Cloudflare Workers
2. Workers 处理请求，调用相应的服务
3. 服务与 D1 数据库交互
4. 返回处理结果给客户端

## 功能特性

### 用户认证

- 用户注册（支持邀请码）
- 用户登录（支持 Turnstile 验证）
- 令牌刷新
- 用户登出
- 用户信息管理

### 授权管理

- **基于角色的访问控制 (RBAC)**: 用户-角色-权限三层结构
- **角色管理**: 创建、更新、删除角色
- **权限管理**: 为角色分配和移除权限
- **用户角色管理**: 为用户分配和移除角色
- **验证码系统**: 邀请码和升级码管理

### 博客功能

- **文章管理**: 创建、编辑、删除、发布文章
- **分类管理**: 文章分类的创建和管理
- **标签管理**: 文章标签的创建和管理
- **评论系统**: 支持多级评论和评论审核
- **文章统计**: 文章浏览量和用户活动统计

### 安全机制

- **Cloudflare Turnstile**: 集成 Cloudflare 的人机验证服务，防止自动化攻击
- **密码哈希**: 使用 scrypt 算法对密码进行哈希处理
- **JWT 令牌**: 使用 JWT 进行身份验证，支持访问令牌和刷新令牌
- **权限验证中间件**: 自动验证用户权限，确保 API 安全
- **CORS 保护**: 支持配置允许的源
- **安全头**: 自动添加安全相关的 HTTP 头

## 数据库设计

### 核心表结构

#### 用户表 (users)
```sql
CREATE TABLE users (
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
```

#### 角色表 (roles)
```sql
CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 权限表 (permissions)
```sql
CREATE TABLE permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 用户-角色关联表 (user_roles)
```sql
CREATE TABLE user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE(user_id, role_id)
);
```

#### 角色-权限关联表 (role_permissions)
```sql
CREATE TABLE role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);
```

#### 验证码表 (verification_codes)
```sql
CREATE TABLE verification_codes (
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
```

#### 文章表 (articles)
```sql
CREATE TABLE articles (
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
```

#### 文章分类表 (categories)
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 文章-分类关联表 (article_categories)
```sql
CREATE TABLE article_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(article_id, category_id)
);
```

#### 标签表 (tags)
```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 文章-标签关联表 (article_tags)
```sql
CREATE TABLE article_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(article_id, tag_id)
);
```

#### 评论表 (comments)
```sql
CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    article_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    parent_id INTEGER, -- 用于回复评论，为空表示顶层评论
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES comments(id)
);
```

#### 用户活动日志 (user_activities)
```sql
CREATE TABLE user_activities (
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
```

## API 文档

### 1. 认证接口

#### 1.1 用户注册

- **URL**: `/api/auth/register`
- **方法**: `POST`
- **请求体**:

```json
{
  "username": "string", // 必填，用户名，长度3-20个字符
  "email": "user@example.com",
  "password": "securepassword",
  "inviteCode": "string", // 可选，邀请码
  "turnstileToken": "0.4AAAAAPQnXw..."
}
```

- **响应示例**:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "string",
      "email": "user@example.com",
      "roles": ["REGULAR_USER"]
    }
  }
}
```

- **说明**:
  - 密码会使用 scrypt 算法进行哈希处理后再存储
  - 邮箱不能重复注册
  - 需要提供有效的 Cloudflare Turnstile 令牌
  - 如果提供有效的邀请码，用户将被分配 PAID_USER 角色

#### 1.2 用户登录

- **URL**: `/api/auth/login`
- **方法**: `POST`
- **请求体**:

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "turnstileToken": "0.4AAAAAPQnXw..."
}
```

- **响应示例**:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "string",
      "email": "user@example.com",
      "roles": ["REGULAR_USER", "PAID_USER"],
      "permissions": ["CREATE_ARTICLE", "EDIT_ARTICLE", "DELETE_ARTICLE", "PUBLISH_ARTICLE"]
    }
  }
}
```

- **说明**:
  - 需要提供有效的 Cloudflare Turnstile 令牌
  - 登录成功后返回访问令牌和刷新令牌
  - 响应中包含用户的角色和权限列表

#### 1.3 刷新令牌

- **URL**: `/api/auth/refresh`
- **方法**: `POST`
- **请求体**:

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- **响应示例**:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

- **说明**:
  - 使用刷新令牌获取新的访问令牌
  - 刷新令牌有效期为 7 天

#### 1.4 用户登出

- **URL**: `/api/auth/logout`
- **方法**: `POST`
- **请求头**: 需要包含有效的访问令牌
- **请求体**: 无
- **响应示例**:

```json
{
  "success": true
}
```

#### 1.5 获取当前用户信息

- **URL**: `/api/auth/me`
- **方法**: `GET`
- **请求头**: 需要包含有效的访问令牌
- **响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 123,
    "username": "string",
    "email": "user@example.com",
    "roles": ["REGULAR_USER", "PAID_USER"],
    "permissions": ["CREATE_ARTICLE", "EDIT_ARTICLE", "DELETE_ARTICLE", "PUBLISH_ARTICLE"],
    "created_at": "2023-01-01T00:00:00Z",
    "last_login": "2023-01-02T00:00:00Z",
    "is_active": true
  }
}
```

### 2. 文章接口

#### 2.1 获取文章列表

- **URL**: `/api/articles`
- **方法**: `GET`
- **查询参数**:
  ```
  page=1           // 页码，默认1
  page_size=20     // 每页记录数，默认20
  sort=created_at  // 排序字段
  order=desc       // 排序方向，asc或desc
  category=1       // 可选，分类ID
  tag=1            // 可选，标签ID
  status=PUBLISHED // 可选，文章状态
  ```
- **响应示例**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "title": "文章标题",
        "content": "文章内容",
        "author": {
          "id": 1,
          "username": "作者"
        },
        "status": "PUBLISHED",
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-02T00:00:00Z",
        "published_at": "2023-01-02T00:00:00Z",
        "view_count": 100,
        "categories": [
          {
            "id": 1,
            "name": "技术"
          }
        ],
        "tags": [
          {
            "id": 1,
            "name": "JavaScript"
          }
        ]
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "page_size": 20,
      "total_pages": 5
    }
  }
}
```

#### 2.2 创建文章

- **URL**: `/api/articles`
- **方法**: `POST`
- **权限要求**: CREATE_ARTICLE
- **请求头**: 需要包含有效的访问令牌
- **请求体**:

```json
{
  "title": "文章标题",
  "content": "文章内容",
  "category_ids": [1, 2],
  "tag_ids": [1, 2],
  "status": "DRAFT" // 可选，默认为 DRAFT
}
```

- **响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "文章标题",
    "content": "文章内容",
    "status": "DRAFT",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-01T00:00:00Z"
  }
}
```

#### 2.3 更新文章

- **URL**: `/api/articles/{id}`
- **方法**: `PUT`
- **权限要求**: EDIT_ARTICLE 或 EDIT_ANY_ARTICLE
- **请求头**: 需要包含有效的访问令牌
- **路径参数**: `id` - 文章ID
- **请求体**:

```json
{
  "title": "新标题",
  "content": "新内容",
  "category_ids": [1, 2],
  "tag_ids": [1, 2],
  "status": "PUBLISHED"
}
```

- **响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "新标题",
    "content": "新内容",
    "status": "PUBLISHED",
    "updated_at": "2023-01-02T00:00:00Z"
  }
}
```

#### 2.4 删除文章

- **URL**: `/api/articles/{id}`
- **方法**: `DELETE`
- **权限要求**: DELETE_ARTICLE 或 DELETE_ANY_ARTICLE
- **请求头**: 需要包含有效的访问令牌
- **路径参数**: `id` - 文章ID
- **响应示例**:

```json
{
  "success": true
}
```

#### 2.5 获取单篇文章详情

- **URL**: `/api/articles/{id}`
- **方法**: `GET`
- **响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "文章标题",
    "content": "文章内容",
    "author": {
      "id": 1,
      "username": "作者"
    },
    "status": "PUBLISHED",
    "created_at": "2023-01-01T00:00:00Z",
    "updated_at": "2023-01-02T00:00:00Z",
    "published_at": "2023-01-02T00:00:00Z",
    "view_count": 100,
    "categories": [
      {
        "id": 1,
        "name": "技术"
      }
    ],
    "tags": [
      {
        "id": 1,
        "name": "JavaScript"
      }
    ],
    "comment_count": 10,
    "like_count": 50
  }
}
```

#### 2.6 更新文章状态

- **URL**: `/api/articles/{id}/status`
- **方法**: `PUT`
- **权限要求**: PUBLISH_ARTICLE 或 EDIT_ANY_ARTICLE
- **请求头**: 需要包含有效的访问令牌
- **路径参数**: `id` - 文章ID
- **请求体**:

```json
{
  "status": "PUBLISHED" // 'DRAFT', 'PUBLISHED', 'ARCHIVED'
}
```

- **响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "PUBLISHED",
    "published_at": "2023-01-02T00:00:00Z"
  }
}
```

#### 2.7 获取文章分类列表

- **URL**: `/api/categories`
- **方法**: `GET`
- **响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "技术",
      "description": "技术相关文章",
      "article_count": 10
    }
  ]
}
```

#### 2.8 获取标签列表

- **URL**: `/api/tags`
- **方法**: `GET`
- **响应示例**:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "JavaScript",
      "article_count": 5
    }
  ]
}
```

#### 2.9 文章统计

- **URL**: `/api/articles/statistics`
- **方法**: `GET`
- **权限要求**: VIEW_STATISTICS
- **请求头**: 需要包含有效的访问令牌
- **响应示例**:

```json
{
  "success": true,
  "data": {
    "total_articles": 100,
    "published_articles": 80,
    "draft_articles": 20,
    "total_views": 10000,
    "average_views": 100,
    "top_articles": [
      {
        "id": 1,
        "title": "热门文章",
        "view_count": 1000
      }
    ],
    "categories_distribution": [
      {
        "category_id": 1,
        "name": "技术",
        "count": 50
      }
    ]
  }
}
```

### 3. 评论接口

#### 3.1 获取文章评论

- **URL**: `/api/articles/{id}/comments`
- **方法**: `GET`
- **查询参数**:
  ```
  page=1           // 页码，默认1
  page_size=20     // 每页记录数，默认20
  sort=created_at  // 排序字段
  order=desc       // 排序方向，asc或desc
  ```
- **响应示例**:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "content": "评论内容",
        "user": {
          "id": 1,
          "username": "评论者"
        },
        "created_at": "2023-01-01T00:00:00Z",
        "replies": [
          {
            "id": 2,
            "content": "回复内容",
            "user": {
              "id": 2,
              "username": "回复者"
            },
            "created_at": "2023-01-02T00:00:00Z"
          }
        ]
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "page_size": 20,
      "total_pages": 3
    }
  }
}
```

#### 3.2 创建评论

- **URL**: `/api/articles/{id}/comments`
- **方法**: `POST`
- **权限要求**: CREATE_COMMENT
- **请求头**: 需要包含有效的访问令牌
- **路径参数**: `id` - 文章ID
- **请求体**:

```json
{
  "content": "评论内容",
  "parent_id": null // 可选，回复的评论ID
}
```

- **响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "content": "评论内容",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

#### 3.3 更新评论

- **URL**: `/api/comments/{id}`
- **方法**: `PUT`
- **权限要求**: EDIT_COMMENT 或 MODERATE_COMMENTS
- **请求头**: 需要包含有效的访问令牌
- **路径参数**: `id` - 评论ID
- **请求体**:

```json
{
  "content": "新评论内容"
}
```

- **响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "content": "新评论内容",
    "updated_at": "2023-01-02T00:00:00Z"
  }
}
```

#### 3.4 删除评论

- **URL**: `/api/comments/{id}`
- **方法**: `DELETE`
- **权限要求**: DELETE_COMMENT 或 MODERATE_COMMENTS
- **请求头**: 需要包含有效的访问令牌
- **路径参数**: `id` - 评论ID
- **响应示例**:

```json
{
  "success": true
}
```

#### 3.5 评论审核

- **URL**: `/api/comments/{id}/status`
- **方法**: `PUT`
- **权限要求**: MODERATE_COMMENTS
- **请求头**: 需要包含有效的访问令牌
- **路径参数**: `id` - 评论ID
- **请求体**:

```json
{
  "status": "APPROVED" // 'PENDING', 'APPROVED', 'REJECTED'
}
```

- **响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "APPROVED",
    "updated_at": "2023-01-02T00:00:00Z"
  }
}
```

#### 3.6 评论点赞/踩

- **URL**: `/api/comments/{id}/vote`
- **方法**: `POST`
- **权限要求**: CREATE_COMMENT
- **请求头**: 需要包含有效的访问令牌
- **路径参数**: `id` - 评论ID
- **请求体**:

```json
{
  "vote": "UP" // 'UP', 'DOWN'
}
```

- **响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "up_votes": 10,
    "down_votes": 2,
    "user_vote": "UP"
  }
}
```

#### 3.7 评论举报

- **URL**: `/api/comments/{id}/report`
- **方法**: `POST`
- **权限要求**: CREATE_COMMENT
- **请求头**: 需要包含有效的访问令牌
- **路径参数**: `id` - 评论ID
- **请求体**:

```json
{
  "reason": "SPAM", // 'SPAM', 'ABUSE', 'OFFENSIVE', 'OTHER'
  "description": "垃圾评论" // 可选，详细说明
}
```

- **响应示例**:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "report_count": 1
  }
}
```

#### 3.8 评论统计

- **URL**: `/api/comments/statistics`
- **方法**: `GET`
- **权限要求**: VIEW_STATISTICS
- **请求头**: 需要包含有效的访问令牌
- **响应示例**:

```json
{
  "success": true,
  "data": {
    "total_comments": 1000,
    "pending_comments": 50,
    "approved_comments": 900,
    "rejected_comments": 50,
    "average_comments_per_article": 10,
    "top_commenters": [
      {
        "user_id": 1,
        "username": "活跃用户",
        "comment_count": 100
      }
    ],
    "recent_reports": [
      {
        "comment_id": 1,
        "report_count": 5,
        "reasons": ["SPAM", "ABUSE"]
      }
    ]
  }
}
```

## 部署指南

### 环境变量配置

在 `wrangler.toml` 中配置以下环境变量：

```toml
[vars]
ALLOWED_ORIGINS = "https://example.com,https://api.example.com"
TURNSTILE_SECRET_KEY = "your-turnstile-secret-key"
TURNSTILE_SITE_KEY = "your-turnstile-site-key"
```

### 数据库初始化

系统会自动初始化数据库表，无需手动操作。

### 部署步骤

1. 安装依赖：
   ```bash
   pnpm install
   ```

2. 登录 Cloudflare：
   ```bash
   pnpm wrangler login
   ```

3. 部署应用：
   ```bash
   pnpm wrangler deploy
   ```

## 前端集成

### 添加 Turnstile 组件

在 HTML 中添加 Turnstile 脚本：

```html
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

在表单中添加 Turnstile 组件：

```html
<form id="login-form">
  <!-- 其他表单字段 -->
  <div class="cf-turnstile" data-sitekey="your-turnstile-site-key"></div>
  <button type="submit">登录</button>
</form>
```

### 处理表单提交

```javascript
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // 获取 Turnstile 令牌
  const turnstileResponse = document.querySelector('[name="cf-turnstile-response"]').value;
  
  // 发送登录请求
  const response = await fetch('https://your-api.workers.dev/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: document.getElementById('email').value,
      password: document.getElementById('password').value,
      turnstileToken: turnstileResponse
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // 登录成功，保存令牌
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    // 跳转到首页
    window.location.href = '/';
  } else {
    // 显示错误信息
    alert(data.message);
  }
});
```

### 权限检查示例

```javascript
// 检查用户是否有特定权限
function hasPermission(permission) {
  const user = JSON.parse(localStorage.getItem('user'));
  return user && user.permissions && user.permissions.includes(permission);
}

// 使用示例
if (hasPermission('CREATE_ARTICLE')) {
  // 显示创建文章按钮
  document.getElementById('create-article-btn').style.display = 'block';
} else {
  // 隐藏创建文章按钮
  document.getElementById('create-article-btn').style.display = 'none';
}

// 路由保护示例
function protectRoute(requiredPermission) {
  if (!hasPermission(requiredPermission)) {
    // 重定向到无权限页面
    window.location.href = '/unauthorized';
    return false;
  }
  return true;
}

// 使用示例
if (protectRoute('MANAGE_USERS')) {
  // 加载用户管理页面
  loadUserManagementPage();
}
```

## 许可证

MIT

