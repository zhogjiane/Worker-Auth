import { Env } from '../types/env'
import { AuthController } from '../controllers/auth.controller'
import { AuthService } from '../services/auth.service'
import { RoleService } from '../services/role.service'
import { createDb } from '../db'
import { createRouteGroup } from './factory'
import { validateRegister, validateLogin, validateRefreshToken } from '../middleware/validation.middleware'

/**
 * 创建认证路由
 * 使用路由组功能组织相关路由
 */
export const createAuthRoutes = createRouteGroup<{ Bindings: Env }>('/auth', (app, env) => {
  // 初始化服务和控制器
  const drizzleDb = createDb(env.DB)
  const roleService = new RoleService(env, drizzleDb)
  const authService = new AuthService(env, roleService, drizzleDb)
  const authController = new AuthController(authService)

  // 公开路由 - 不需要认证的接口
  app.post('/register', validateRegister, authController.register)
  app.post('/login', validateLogin, authController.login)
  app.post('/refresh', validateRefreshToken, authController.refreshToken)

  // 需要认证的路由 - 需要用户登录的接口
  app.get('/me', authController.getCurrentUser)
  app.put('/me', authController.updateUser)
  app.put('/me/password', authController.changePassword)

  return app
}) 