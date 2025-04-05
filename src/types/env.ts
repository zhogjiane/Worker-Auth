/**
 * 环境变量类型定义
 */
export interface Env {
  // 数据库绑定
  DB: D1Database
  
  // JWT 绑定
  JWT: {
    sign(payload: any, options?: any): Promise<string>
    verify(token: string): Promise<any>
  }
  
  // JWT 密钥
  JWT_SECRET: string
  
  // JWT 过期时间
  JWT_EXPIRES_IN: string
  
  // JWT 刷新密钥
  JWT_REFRESH_SECRET: string
  
  // JWT 刷新过期时间
  JWT_REFRESH_EXPIRES_IN: string
  
  // API 配置
  API_VERSION: string
  MAX_REQUESTS_PER_MINUTE: number
  
  // 安全配置
  ALLOWED_ORIGINS: string
  
  // Turnstile 配置
  TURNSTILE_SECRET_KEY: string
  TURNSTILE_SITE_KEY: string
} 