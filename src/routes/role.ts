import { UserRoleEnum ,assignRoleSchema} from '../types/auth'
import { ValidationError } from '../errors/error.types'
import { Env } from '../types/env'
import { ServiceFactory } from '../services/service.factory'
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware'
import { validateCreateRole, validateUpdateRole, validateAssignRole } from '../middleware/validation.middleware'
import { createDb } from '../db'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { DbSchema } from '../db'
import { createRouteGroup } from './factory'
import type { CreateRoleRequest, UpdateRoleRequest, AssignRoleRequest } from '../types/auth'


/**
 * 创建角色路由
 * 使用路由组功能组织相关路由
 */
export const createRoleRoutes = createRouteGroup<{ Bindings: Env }>('/roles', (app, env) => {
  // 初始化数据库连接
  const drizzleDb: DrizzleD1Database<DbSchema> = createDb(env.DB)
  
  // 创建服务工厂并获取角色服务实例
  const serviceFactory = ServiceFactory.getInstance(env, drizzleDb)
  const roleService = serviceFactory.getRoleService()

  /**
   * 创建角色
   * POST /api/roles
   */
  app.post('/', authMiddleware, roleMiddleware([UserRoleEnum.ADMIN]), validateCreateRole, async (c) => {
    // 获取已验证的请求数据
    const data = c.get('valid') as CreateRoleRequest
    
    // 调用创建角色服务
    const result = await roleService.createRole(data)
    
    return c.json(result)
  })

  /**
   * 更新角色
   * PUT /api/roles/:id
   */
  app.put('/:id', authMiddleware, roleMiddleware([UserRoleEnum.ADMIN]), validateUpdateRole, async (c) => {
    // 获取角色ID
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      throw new ValidationError('无效的角色ID', [])
    }
    
    // 获取已验证的请求数据
    const data = c.get('valid') as UpdateRoleRequest
    
    // 调用更新角色服务
    const result = await roleService.updateRole(id, data)
    
    return c.json(result)
  })

  /**
   * 删除角色
   * DELETE /api/roles/:id
   */
  app.delete('/:id', authMiddleware, roleMiddleware([UserRoleEnum.ADMIN]), async (c) => {
    // 获取角色ID
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      throw new ValidationError('无效的角色ID', [])
    }
    
    // 调用删除角色服务
    const result = await roleService.deleteRole(id)
    
    return c.json(result)
  })

  /**
   * 获取角色列表
   * GET /api/roles
   */
  app.get('/', authMiddleware, roleMiddleware([UserRoleEnum.ADMIN]), async (c) => {
    // 获取查询参数
    const page = parseInt(c.req.query('page') ?? '1')
    const pageSize = parseInt(c.req.query('pageSize') ?? '20')
    const sort = c.req.query('sort') ?? 'name'
    const order = (c.req.query('order') ?? 'asc') as 'asc' | 'desc'
    
    // 调用获取角色列表服务
    const result = await roleService.getRoles(page, pageSize, sort, order)
    
    return c.json(result)
  })

  /**
   * 获取角色详情
   * GET /api/roles/:id
   */
  app.get('/:id', authMiddleware, roleMiddleware([UserRoleEnum.ADMIN]), async (c) => {
    // 获取角色ID
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      throw new ValidationError('无效的角色ID', [])
    }
    
    // 调用获取角色详情服务
    const result = await roleService.getRole(id)
    
    return c.json(result)
  })

  /**
   * 为用户分配角色
   * POST /api/roles/assign
   */
  app.post('/assign', authMiddleware, roleMiddleware([UserRoleEnum.ADMIN]), validateAssignRole, async (c) => {
    // 获取已验证的请求数据
    const data = c.get('valid') as AssignRoleRequest
    
    // 调用分配角色服务
    await roleService.assignRoleToUser(data.userId, data.roleName)
    
    return c.json({ success: true })
  })

  /**
   * 移除用户的角色
   * POST /api/roles/remove
   */
  app.post('/remove', authMiddleware, roleMiddleware([UserRoleEnum.ADMIN]), async (c) => {
    // 解析请求体
    const body = await c.req.json()
    
    // 验证请求参数
    const data = assignRoleSchema.parse(body)
    
    // 调用移除角色服务
    await roleService.removeRoleFromUser(data.userId, data.roleName as UserRoleEnum)
    
    return c.json({ success: true })
  })

  return app
}) 