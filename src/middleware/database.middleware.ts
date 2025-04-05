import { MiddlewareHandler } from 'hono'
import { Env } from '../types/env'
import { ResponseUtil } from '../utils/response.util'
import { createDb } from '../db'
import { users, roles, permissions,  rolePermissions } from '../db/schema'
import { eq } from 'drizzle-orm'

/**
 * 检查数据库表是否存在，如果不存在则创建
 */
export const databaseInitMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  try {
    const db = createDb(c.env.DB)

    // 尝试查询用户表，如果表不存在会抛出错误
    try {
      await db.select().from(users).limit(1)
    } catch (error) {
      console.log('Initializing database tables...')
      
      // 使用事务执行所有初始化操作
      await db.transaction(async (tx) => {
        // 初始化基础角色和权限
        await initializeBaseRolesAndPermissions(tx)
      })
      
      console.log('Database initialization completed')
    }

    // 继续处理请求
    return next()
  } catch (error) {
    console.error('Database initialization error:', error)
    return ResponseUtil.error(
      c,
      '数据库初始化失败',
      'DATABASE_ERROR',
      500
    )
  }
}

/**
 * 初始化基础角色和权限
 */
async function initializeBaseRolesAndPermissions(db: any) {
  // 定义基础角色
  const baseRoles = [
    { name: 'ADMIN', description: '系统管理员' },
    { name: 'EDITOR', description: '内容编辑' },
    { name: 'USER', description: '普通用户' }
  ]

  // 定义基础权限
  const basePermissions = [
    { name: 'manage_users', description: '管理用户' },
    { name: 'manage_roles', description: '管理角色' },
    { name: 'manage_permissions', description: '管理权限' },
    { name: 'manage_articles', description: '管理文章' },
    { name: 'manage_comments', description: '管理评论' }
  ]

  // 插入角色
  for (const role of baseRoles) {
    await db.insert(roles).values(role)
  }

  // 插入权限
  for (const permission of basePermissions) {
    await db.insert(permissions).values(permission)
  }

  // 获取管理员角色ID
  const adminRole = await db.select().from(roles).where(eq(roles.name, 'ADMIN')).limit(1)
  
  if (adminRole[0]) {
    // 获取所有权限ID
    const allPermissions = await db.select().from(permissions)
    
    // 为管理员分配所有权限
    for (const permission of allPermissions) {
      await db.insert(rolePermissions).values({
        roleId: adminRole[0].id,
        permissionId: permission.id
      })
    }
  }
} 