import { UserRoleEnum } from '../types/auth'
import { ValidationError } from '../errors/error.types'
import { Env } from '../types/env'
import { ServiceFactory } from '../services/service.factory'
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware'
import { validateCreatePermission, validateUpdatePermission } from '../middleware/validation.middleware'
import { createDb } from '../db'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { DbSchema } from '../db'
import { createRouteGroup } from './factory'
import type { CreatePermissionRequest, UpdatePermissionRequest } from '../types/auth'

/**
 * 创建权限路由
 * 使用路由组功能组织相关路由
 */
export const createPermissionRoutes = createRouteGroup<{ Bindings: Env }>('/permissions', (app, env) => {
  // 初始化数据库连接
  const drizzleDb: DrizzleD1Database<DbSchema> = createDb(env.DB)
  
  // 创建服务工厂并获取权限服务实例
  const serviceFactory = ServiceFactory.getInstance(env, drizzleDb)
  const permissionService = serviceFactory.getPermissionService()

  /**
   * 创建权限
   * POST /api/permissions
   */
  app.post('/', authMiddleware, roleMiddleware([UserRoleEnum.ADMIN]), validateCreatePermission, async (c) => {
    // 获取已验证的请求数据
    const data = c.get('valid') as CreatePermissionRequest
    
    // 调用创建权限服务
    const result = await permissionService.createPermission(data)
    
    return c.json(result)
  })

  /**
   * 更新权限
   * PUT /api/permissions/:id
   */
  app.put('/:id', authMiddleware, roleMiddleware([UserRoleEnum.ADMIN]), validateUpdatePermission, async (c) => {
    // 获取权限ID
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      throw new ValidationError('无效的权限ID', [])
    }
    
    // 获取已验证的请求数据
    const data = c.get('valid') as UpdatePermissionRequest
    
    // 调用更新权限服务
    const result = await permissionService.updatePermission(id, data)
    
    return c.json(result)
  })

  /**
   * 删除权限
   * DELETE /api/permissions/:id
   */
  app.delete('/:id', authMiddleware, roleMiddleware([UserRoleEnum.ADMIN]), async (c) => {
    // 获取权限ID
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      throw new ValidationError('无效的权限ID', [])
    }
    
    // 调用删除权限服务
    const result = await permissionService.deletePermission(id)
    
    return c.json(result)
  })

  /**
   * 获取权限列表
   * GET /api/permissions
   */
  app.get('/', authMiddleware, roleMiddleware([UserRoleEnum.ADMIN]), async (c) => {
    // 获取查询参数
    const page = parseInt(c.req.query('page') ?? '1')
    const pageSize = parseInt(c.req.query('pageSize') ?? '20')
    const sort = c.req.query('sort') ?? 'name'
    const order = (c.req.query('order') ?? 'asc') as 'asc' | 'desc'
    
    // 调用获取权限列表服务
    const result = await permissionService.getPermissions(page, pageSize, sort, order)
    
    return c.json(result)
  })

  /**
   * 获取权限详情
   * GET /api/permissions/:id
   */
  app.get('/:id', authMiddleware, roleMiddleware([UserRoleEnum.ADMIN]), async (c) => {
    // 获取权限ID
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      throw new ValidationError('无效的权限ID', [])
    }
    
    // 调用获取权限详情服务
    const result = await permissionService.getPermission(id)
    
    return c.json(result)
  })

  return app
}) 