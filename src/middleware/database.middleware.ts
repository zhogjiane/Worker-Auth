import { MiddlewareHandler } from 'hono'
import { Env } from '../types/env'

/**
 * 检查数据库表是否存在，如果不存在则创建
 */
export const databaseInitMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  try {
    const db = c.env.DB

    // 检查 ip_records 表是否存在
    const result = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='ip_records'"
    ).all()

    if (result.results.length === 0) {
      console.log('Initializing database tables...')
      
      // 创建 users 表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT,
          bio TEXT,
          role TEXT DEFAULT 'user',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run()

      // 创建 ip_records 表
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS ip_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ip_address TEXT NOT NULL,
          request_time TEXT DEFAULT CURRENT_TIMESTAMP,
          is_banned INTEGER DEFAULT 0,
          ban_reason TEXT,
          ban_expires_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `).run()

      // 创建索引
      await db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_ip_address ON ip_records(ip_address)'
      ).run()
      await db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_is_banned ON ip_records(is_banned)'
      ).run()
      await db.prepare(
        'CREATE INDEX IF NOT EXISTS idx_ban_expires_at ON ip_records(ban_expires_at)'
      ).run()

      console.log('Database tables initialized successfully')
    }

    await next()
  } catch (error) {
    console.error('Database initialization failed:', error)
    return c.json({
      success: false,
      error: 'Database initialization failed'
    }, 500)
  }
} 