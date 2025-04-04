# Worker-Auth

基于 Cloudflare Workers 和 D1 数据库构建的轻量级认证服务，提供用户注册、登录、令牌刷新等功能。

## 项目概述

Worker-Auth 是一个专为现代 Web 应用设计的认证服务，具有以下特点：

- **轻量级**: 基于 Cloudflare Workers 边缘计算，全球低延迟
- **高性能**: 利用 Cloudflare 的全球网络，提供快速响应
- **安全**: 内置 IP 封禁、验证码、密码哈希等安全机制
- **易集成**: 提供简洁的 RESTful API，易于前端集成
- **可扩展**: 模块化设计，易于添加新功能

## 技术栈

- **运行时**: Cloudflare Workers
- **数据库**: Cloudflare D1 (SQLite)
- **缓存**: Cloudflare KV
- **Web 框架**: Hono.js
- **验证库**: Zod
- **JWT 库**: jsonwebtoken
- **开发工具**: Wrangler, TypeScript

## 系统架构

### 核心模块

- **认证模块**: 处理用户注册、登录、登出等认证操作
- **验证码模块**: 生成和验证验证码，防止自动化攻击
- **IP 管理模块**: 记录和封禁异常 IP，防止暴力破解
- **错误处理模块**: 统一处理各类错误，提供友好的错误信息

### 数据流

1. 客户端发送请求到 Cloudflare Workers
2. Workers 处理请求，调用相应的服务
3. 服务与 D1 数据库和 KV 存储交互
4. 返回处理结果给客户端

## 功能特性

### 用户认证

- 用户注册
- 用户登录
- 令牌刷新
- 用户登出

### 安全机制

- IP 封禁: 自动封禁异常 IP，防止暴力破解
- 验证码: 生成和验证验证码，防止自动化攻击
- 密码哈希: 使用 scrypt 算法对密码进行哈希处理
- JWT 令牌: 使用 JWT 进行身份验证，支持访问令牌和刷新令牌

### 数据库设计

#### users 表

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | INTEGER | 主键，自增 |
| email | TEXT | 用户邮箱，唯一 |
| password | TEXT | 密码哈希 |
| name | TEXT | 用户名称 |
| bio | TEXT | 用户简介 |
| role | TEXT | 用户角色 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

#### ip_records 表

| 字段名 | 类型 | 说明 |
| --- | --- | --- |
| id | INTEGER | 主键，自增 |
| ip_address | TEXT | IP 地址 |
| request_time | TEXT | 请求时间 |
| is_banned | INTEGER | 是否被封禁 |
| ban_reason | TEXT | 封禁原因 |
| ban_expires_at | TEXT | 封禁过期时间 |
| created_at | TEXT | 创建时间 |
| updated_at | TEXT | 更新时间 |

## API 文档

### 1. 验证码接口

#### 1.1 生成验证码

- **URL**: `/api/captcha/generate`
- **方法**: `GET`
- **请求参数**: 无
- **请求头**: 系统会自动从请求头中获取客户端 IP 地址（CF-Connecting-IP, X-Forwarded-For 或 X-Real-IP）
- **响应示例**:

```json
{
  "success": true,
  "data": {
    "key": "1649123456789-a1b2c3d4"
  }
}
```

- **说明**: 
  - 返回的 `key` 用于后续验证码验证
  - 系统会自动检查客户端 IP 是否被封禁，如果被封禁将返回错误信息
  - 验证码有效期为 5 分钟

#### 1.2 验证验证码

- **URL**: `/api/captcha/verify`
- **方法**: `POST`
- **请求头**: 系统会自动从请求头中获取客户端 IP 地址（CF-Connecting-IP, X-Forwarded-For 或 X-Real-IP）
- **请求体**:

```json
{
  "key": "1649123456789-a1b2c3d4",
  "captcha": "abcd"
}
```

- **响应示例**:

```json
{
  "success": true,
  "data": {
    "valid": true
  }
}
```

- **说明**:
  - 系统会自动检查客户端 IP 是否被封禁，如果被封禁将返回错误信息
  - 验证码验证成功后会自动删除，不能重复使用

### 2. 认证接口

#### 2.1 用户注册

- **URL**: `/api/auth/register`
- **方法**: `POST`
- **请求头**: 系统会自动从请求头中获取客户端 IP 地址（CF-Connecting-IP, X-Forwarded-For 或 X-Real-IP）
- **请求体**:

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "用户名",
  "bio": "个人简介",
  "captchaKey": "1649123456789-a1b2c3d4",
  "captcha": "abcd"
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
      "email": "user@example.com",
      "name": "用户名",
      "bio": "个人简介",
      "role": "user"
    }
  }
}
```

- **说明**:
  - 系统会自动检查客户端 IP 是否被封禁，如果被封禁将返回错误信息
  - 密码会使用 scrypt 算法进行哈希处理后再存储
  - 邮箱不能重复注册

#### 2.2 用户登录

- **URL**: `/api/auth/login`
- **方法**: `POST`
- **请求头**: 系统会自动从请求头中获取客户端 IP 地址（CF-Connecting-IP, X-Forwarded-For 或 X-Real-IP）
- **请求体**:

```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "captchaKey": "1649123456789-a1b2c3d4",
  "captcha": "abcd"
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
      "email": "user@example.com",
      "name": "用户名",
      "bio": "个人简介",
      "role": "user"
    }
  }
}
```

- **说明**:
  - 系统会自动检查客户端 IP 是否被封禁，如果被封禁将返回错误信息
  - 登录成功后会返回访问令牌和刷新令牌

#### 2.3 刷新令牌

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
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

- **说明**:
  - 使用刷新令牌获取新的访问令牌和刷新令牌
  - 刷新令牌有效期为 7 天

#### 2.4 用户登出

- **URL**: `/api/auth/logout`
- **方法**: `POST`
- **请求头**: 需要包含 `Authorization: Bearer {accessToken}`
- **请求体**: 无
- **响应示例**:

```json
{
  "success": true,
  "message": "登出成功"
}
```

## 部署指南

### 环境要求

- Cloudflare 账户
- Node.js 16+ 或 Bun 1.0+
- Wrangler CLI

### 安装

1. 克隆仓库

```bash
git clone https://github.com/yourusername/worker-auth.git
cd worker-auth
```

2. 安装依赖

```bash
npm install
# 或
bun install
```

### 配置

1. 创建 D1 数据库

```bash
wrangler d1 create worker-auth-db
```

2. 创建 KV 命名空间

```bash
wrangler kv:namespace create CAPTCHA_KV
```

3. 配置 wrangler.toml

```toml
name = "worker-auth"
main = "src/index.ts"
compatibility_date = "2023-01-01"

[[d1_databases]]
binding = "DB"
database_name = "worker-auth-db"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "CAPTCHA_KV"
id = "your-kv-id"

[vars]
JWT_SECRET = "your-jwt-secret"
```

4. 初始化数据库

```bash
wrangler d1 execute worker-auth-db --file=./schema.sql
```

### 本地开发

```bash
wrangler dev
```

### 部署

```bash
wrangler deploy
```

## 前端集成指南

### 部署信息

#### 后端服务 (Worker-Auth)

- **部署平台**: Cloudflare Workers
- **域名**: `api.litesmile.xyz` (建议使用此域名)
- **API 基础路径**: `https://api.litesmile.xyz/api`

#### 前端项目

- **部署平台**: Cloudflare Pages
- **域名**: `www.litesmile.xyz`

### 域名配置

为了使前端和后端服务能够正常通信，需要进行以下配置：

#### 1. 配置 Worker 域名

1. 登录 Cloudflare 控制台
2. 进入 Workers & Pages 部分
3. 选择 Worker-Auth 项目
4. 点击 "Triggers" 标签
5. 在 "Custom Domains" 部分，添加自定义域名 `api.litesmile.xyz`
6. 按照 Cloudflare 的指引完成 DNS 配置

#### 2. 配置 CORS

Worker-Auth 服务已配置 CORS，允许来自 `www.litesmile.xyz` 的请求：

```typescript
app.use('*', cors({
  origin: 'https://www.litesmile.xyz',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Requested-With'],
  maxAge: 600,
  credentials: true,
}))
```

### 前端集成示例

#### 1. 环境配置

在前端项目中创建环境配置文件 `.env`:

```
VITE_API_BASE_URL=https://api.litesmile.xyz/api
```

#### 2. API 客户端封装

创建一个 API 客户端文件 `src/api/auth.ts`:

```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器，添加 token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器，处理 token 过期
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // 如果是 401 错误且不是刷新 token 的请求
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // 尝试刷新 token
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await apiClient.post('/auth/refresh', { refreshToken });
        
        // 更新 token
        localStorage.setItem('accessToken', response.data.data.accessToken);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);
        
        // 重试原始请求
        originalRequest.headers.Authorization = `Bearer ${response.data.data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // 刷新 token 失败，清除 token 并跳转到登录页
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// 验证码相关 API
export const captchaApi = {
  // 生成验证码
  generate: async () => {
    const response = await apiClient.get('/captcha/generate');
    return response.data;
  },
  
  // 验证验证码
  verify: async (key: string, captcha: string) => {
    const response = await apiClient.post('/captcha/verify', { key, captcha });
    return response.data;
  }
};

// 认证相关 API
export const authApi = {
  // 用户注册
  register: async (data: {
    email: string;
    password: string;
    name?: string;
    bio?: string;
    captchaKey: string;
    captcha: string;
  }) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },
  
  // 用户登录
  login: async (data: {
    email: string;
    password: string;
    captchaKey: string;
    captcha: string;
  }) => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },
  
  // 刷新令牌
  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },
  
  // 用户登出
  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  }
};
```

#### 3. 使用示例

##### 3.1 注册流程

```typescript
import { captchaApi, authApi } from '../api/auth';

// 注册流程
async function handleRegister(email: string, password: string, name: string) {
  try {
    // 1. 获取验证码
    const captchaResponse = await captchaApi.generate();
    const captchaKey = captchaResponse.data.key;
    
    // 2. 显示验证码输入界面，获取用户输入的验证码
    // 假设用户输入了 "abcd"
    const userCaptcha = "abcd";
    
    // 3. 验证验证码
    const verifyResponse = await captchaApi.verify(captchaKey, userCaptcha);
    if (!verifyResponse.data.valid) {
      throw new Error('验证码错误');
    }
    
    // 4. 注册用户
    const registerResponse = await authApi.register({
      email,
      password,
      name,
      captchaKey,
      captcha: userCaptcha
    });
    
    // 5. 保存 token
    localStorage.setItem('accessToken', registerResponse.data.accessToken);
    localStorage.setItem('refreshToken', registerResponse.data.refreshToken);
    
    // 6. 跳转到首页
    window.location.href = '/';
    
    return registerResponse.data.user;
  } catch (error) {
    console.error('注册失败:', error);
    throw error;
  }
}
```

##### 3.2 登录流程

```typescript
// 登录流程
async function handleLogin(email: string, password: string) {
  try {
    // 1. 获取验证码
    const captchaResponse = await captchaApi.generate();
    const captchaKey = captchaResponse.data.key;
    
    // 2. 显示验证码输入界面，获取用户输入的验证码
    // 假设用户输入了 "abcd"
    const userCaptcha = "abcd";
    
    // 3. 验证验证码
    const verifyResponse = await captchaApi.verify(captchaKey, userCaptcha);
    if (!verifyResponse.data.valid) {
      throw new Error('验证码错误');
    }
    
    // 4. 登录用户
    const loginResponse = await authApi.login({
      email,
      password,
      captchaKey,
      captcha: userCaptcha
    });
    
    // 5. 保存 token
    localStorage.setItem('accessToken', loginResponse.data.accessToken);
    localStorage.setItem('refreshToken', loginResponse.data.refreshToken);
    
    // 6. 跳转到首页
    window.location.href = '/';
    
    return loginResponse.data.user;
  } catch (error) {
    console.error('登录失败:', error);
    throw error;
  }
}
```

##### 3.3 登出流程

```typescript
// 登出流程
async function handleLogout() {
  try {
    await authApi.logout();
    
    // 清除 token
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // 跳转到登录页
    window.location.href = '/login';
  } catch (error) {
    console.error('登出失败:', error);
    throw error;
  }
}
```

## 项目结构

```
worker-auth/
├── src/
│   ├── errors/           # 错误处理
│   ├── middleware/       # 中间件
│   ├── routes/           # 路由
│   ├── services/         # 服务
│   ├── types/            # 类型定义
│   ├── utils/            # 工具函数
│   └── index.ts          # 入口文件
├── .gitignore            # Git 忽略文件
├── package.json          # 项目配置
├── README.md             # 项目说明
├── schema.sql            # 数据库模式
└── wrangler.toml         # Wrangler 配置
```

## 开发指南

### 添加新路由

1. 在 `src/routes` 目录下创建新的路由文件
2. 在 `src/index.ts` 中注册新路由

### 添加新服务

1. 在 `src/services` 目录下创建新的服务文件
2. 在 `src/services/service.factory.ts` 中添加获取服务实例的方法

### 错误处理

使用 `src/errors/error.types.ts` 中定义的错误类型，确保错误处理一致。

### 安全最佳实践

1. 始终验证用户输入
2. 使用参数化查询防止 SQL 注入
3. 对敏感数据进行加密
4. 实现请求频率限制
5. 使用 HTTPS 传输数据

### 性能优化

1. 使用缓存减少数据库查询
2. 优化数据库查询
3. 使用边缘计算减少延迟

## 贡献指南

1. Fork 仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请参阅 [LICENSE](LICENSE) 文件

## 联系方式

如有任何问题或建议，请联系：

- 邮箱: support@litesmile.xyz
- 网站: https://www.litesmile.xyz 