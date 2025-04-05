import { MiddlewareHandler } from 'hono'
import { Env } from '../types/env'

/**
 * 环境变量中间件
 * 用于在路由组中传递环境变量
 */
export const envMiddleware = (env: Env): MiddlewareHandler => {
  return async (c, next) => {
    c.set('env', env)
    await next()
  }
} 