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
- **JWT 库**: jose
- **开发工具**: Wrangler, TypeScript, esbuild

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
pnpm install
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
pnpm dev
```

### 构建和部署

```bash
pnpm build

pnpm deploy
```

### 环境变量配置

在部署之前，需要在 Cloudflare Workers 中配置以下变量：

#### 1. 环境变量（Variables）
在 `wrangler.toml` 中配置：

```toml
[vars]
# API 配置
API_VERSION = "v1"
MAX_REQUESTS_PER_MINUTE = "60"

# 安全配置
ALLOWED_ORIGINS = "https://www.litesmile.xyz"
CAPTCHA_EXPIRY = "300"  # 验证码有效期（秒）
IP_BAN_DURATION = "3600"  # IP 封禁时长（秒）
MAX_FAILED_ATTEMPTS = "5"  # 最大失败尝试次数
```

#### 2. 密钥（Secrets）
使用 wrangler CLI 设置：

```bash
# JWT 签名密钥
wrangler secret put JWT_SECRET

# 数据库连接信息
wrangler secret put DATABASE_URL

# KV 命名空间 ID
wrangler secret put KV_NAMESPACE
```

#### 3. 变量使用建议

1. **必须使用密钥（Secrets）的信息**：
   - JWT 签名密钥（JWT_SECRET）
   - 数据库连接字符串（DATABASE_URL）
   - API 密钥和令牌
   - 其他敏感凭证

2. **可以使用环境变量（Variables）的信息**：
   - API 版本号
   - 请求限制配置
   - 允许的域名列表
   - 功能开关
   - 超时设置
   - 其他非敏感配置

3. **最佳实践**：
   - 定期轮换密钥
   - 使用强密码生成器生成密钥
   - 限制密钥的访问权限
   - 在代码中通过环境变量引用密钥
   - 使用 TypeScript 类型确保类型安全

## 前端集成指南

### 部署信息

#### 后端服务 (Worker-Auth)

- **部署平台**: Cloudflare Workers
- **域名**: `api.litesmile.xyz` (建议使用此域名)
- **API 基础路径**: `https://api.litesmile.xyz/api`

#### 前端项目

- **部署平台**: Cloudflare Pages
- **域名**: `www.litesmile.xyz`

### 使用 Alova.js 集成

#### 1. 安装依赖

```bash
# 安装 alova 和 alova 适配器
pnpm add alova @alova/adapter-axios
```

#### 2. 创建 API 实例

```typescript
// src/api/instance.ts
import { createAlova } from 'alova'
import { axiosRequestAdapter } from '@alova/adapter-axios'
import axios from 'axios'

// 创建 axios 实例
const axiosInstance = axios.create({
  baseURL: 'https://api.litesmile.xyz/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 创建 alova 实例
export const alovaInstance = createAlova({
  baseURL: 'https://api.litesmile.xyz/api',
  requestAdapter: axiosRequestAdapter(),
  beforeRequest: (config) => {
    // 添加 token
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  responded: {
    // 响应拦截器
    onSuccess: (response) => {
      return response.data
    },
    onError: (error) => {
      // 处理错误
      if (error.response?.status === 401) {
        // token 过期，尝试刷新
        return handleTokenRefresh()
      }
      throw error
    }
  }
})

// 处理 token 刷新
async function handleTokenRefresh() {
  try {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new Error('No refresh token')
    }

    const { data } = await axiosInstance.post('/auth/refresh', {
      refreshToken
    })

    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)

    // 重试原请求
    return alovaInstance.Get('/auth/refresh').send()
  } catch (error) {
    // 刷新失败，清除 token 并跳转到登录页
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    window.location.href = '/login'
    throw error
  }
}
```

#### 3. 创建 API 方法

```typescript
// src/api/auth.ts
import { alovaInstance } from './instance'

// 验证码相关
export const captchaApi = {
  // 生成验证码
  generate: () => alovaInstance.Get('/captcha/generate'),
  
  // 验证验证码
  verify: (key: string, captcha: string) => 
    alovaInstance.Post('/captcha/verify', { key, captcha })
}

// 认证相关
export const authApi = {
  // 用户注册
  register: (data: {
    email: string
    password: string
    name: string
    captchaKey: string
    captcha: string
  }) => alovaInstance.Post('/auth/register', data),

  // 用户登录
  login: (data: {
    email: string
    password: string
    captchaKey: string
    captcha: string
  }) => alovaInstance.Post('/auth/login', data),

  // 刷新令牌
  refresh: (data: { refreshToken: string }) => 
    alovaInstance.Post('/auth/refresh', data),

  // 用户登出
  logout: () => alovaInstance.Post('/auth/logout')
}
```

#### 4. 在组件中使用

```typescript
// src/components/LoginForm.tsx
import { useRequest } from 'alova'
import { captchaApi, authApi } from '../api/auth'

export function LoginForm() {
  // 获取验证码
  const { data: captchaData, send: getCaptcha } = useRequest(captchaApi.generate)
  
  // 登录请求
  const { loading, send: login } = useRequest(authApi.login, {
    immediate: false
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // 1. 获取验证码
      const captchaResponse = await getCaptcha()
      const captchaKey = captchaResponse.data.key
      
      // 2. 显示验证码输入界面，获取用户输入的验证码
      const userCaptcha = "abcd" // 实际应从表单获取
      
      // 3. 验证验证码
      const verifyResponse = await captchaApi.verify(captchaKey, userCaptcha)
      if (!verifyResponse.data.valid) {
        throw new Error('验证码错误')
      }
      
      // 4. 登录用户
      const loginResponse = await login({
        email: "user@example.com",
        password: "password",
        captchaKey,
        captcha: userCaptcha
      })
      
      // 5. 保存 token
      localStorage.setItem('accessToken', loginResponse.data.accessToken)
      localStorage.setItem('refreshToken', loginResponse.data.refreshToken)
      
      // 6. 跳转到首页
      window.location.href = '/'
    } catch (error) {
      console.error('登录失败:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 表单内容 */}
    </form>
  )
}
```

#### 5. 全局状态管理

```typescript
// src/stores/auth.ts
import { create } from 'zustand'
import { authApi } from '../api/auth'

interface AuthState {
  user: any | null
  isAuthenticated: boolean
  login: (data: any) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  
  login: async (data) => {
    const response = await authApi.login(data)
    set({
      user: response.data.user,
      isAuthenticated: true
    })
  },
  
  logout: async () => {
    await authApi.logout()
    set({
      user: null,
      isAuthenticated: false
    })
  }
}))
```

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
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 3600,
  credentials: true
}))
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