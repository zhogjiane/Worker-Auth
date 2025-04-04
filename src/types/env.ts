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
  
  // 其他环境变量...
} 