import { Hono } from 'hono'
import { Env } from '../types/env'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { DbSchema } from '../db'

/**
 * 创建路由组的工厂函数
 * @param basePath - 路由基础路径
 * @param setupRoutes - 路由设置函数
 * @returns 返回一个创建路由的函数
 */
export function createRouteGroup<T extends { Bindings: Env }>(
  basePath: string,
  setupRoutes: (app: Hono<T>, env: Env, drizzle?: DrizzleD1Database<DbSchema>) => void
) {
  return (env: Env, drizzle?: DrizzleD1Database<DbSchema>) => {
    const app = new Hono<T>()
    setupRoutes(app, env, drizzle)
    return app
  }
} 