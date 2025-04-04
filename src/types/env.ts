/**
 * 环境变量类型定义
 */
export interface Env {
  // 数据库绑定
  DB: D1Database
  
  // KV 存储绑定
  CAPTCHA_KV: KVNamespace
  
  // JWT 绑定
  JWT: {
    sign(payload: any, options?: any): Promise<string>
    verify(token: string): Promise<any>
  }
  
  // JWT 密钥
  JWT_SECRET: string
  
  // API 配置
  API_VERSION: string
  MAX_REQUESTS_PER_MINUTE: string
  
  // 安全配置
  ALLOWED_ORIGINS: string
  CAPTCHA_EXPIRY: string
  IP_BAN_DURATION: string
  MAX_FAILED_ATTEMPTS: string
} 