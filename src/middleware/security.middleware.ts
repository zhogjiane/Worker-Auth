import { MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'
import { Env } from '../types/env'

/**
 * 安全相关的 HTTP 头
 */
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
}

/**
 * CORS 中间件配置
 */
export const corsMiddleware = (env: Env) => cors({
  origin: (origin) => {
    // 从环境变量获取允许的域名列表
    const allowedOrigins = env.ALLOWED_ORIGINS.split(',')
    // 如果在允许的域名列表中，则允许访问
    return allowedOrigins.includes(origin) ? origin : ''
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 3600,
  credentials: true
})

/**
 * 安全头中间件
 */
export const securityHeadersMiddleware: MiddlewareHandler = async (c, next) => {
  // 添加安全相关的 HTTP 头
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    c.res.headers.set(key, value)
  })

  await next()
}

/**
 * 请求方法验证中间件
 */
export const methodValidationMiddleware: MiddlewareHandler = async (c, next) => {
  const method = c.req.method
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']

  if (!allowedMethods.includes(method)) {
    return c.json(
      {
        success: false,
        message: '不支持的请求方法',
        code: 'METHOD_NOT_ALLOWED'
      },
      405
    )
  }

  await next()
} 