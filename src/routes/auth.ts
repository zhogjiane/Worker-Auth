import { Hono } from 'hono'
import { ServiceFactory } from '../services/service.factory'
import { BusinessError } from '../errors/error.types'
import { loginSchema, registerSchema, refreshTokenSchema } from '../types/auth'
import { ResponseUtil } from '../utils/response.util'
import { createDb } from '../db'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { DbSchema } from '../db'
import type { UserCreateInput } from '../types/user'

const auth = new Hono()

// 获取服务实例
const getAuthService = (c: any) => {
  // 初始化数据库连接
  const drizzleDb: DrizzleD1Database<DbSchema> = createDb(c.env.DB)
  // 获取服务工厂实例
  const serviceFactory = ServiceFactory.getInstance(c.env, drizzleDb)
  return serviceFactory.getAuthService()
}

// 注册路由
auth.post('/register', async (c) => {
  try {
    // 验证请求数据
    const data = await c.req.json()
    const validatedData = registerSchema.parse(data)
    
    // 转换为 UserCreateInput 格式
    const userInput: UserCreateInput = {
      email: validatedData.email,
      username: validatedData.email.split('@')[0], // 使用邮箱前缀作为用户名
      password: validatedData.password
    }
    
    // 调用服务
    const result = await getAuthService(c).register(userInput)
    
    return ResponseUtil.success(c, result)
  } catch (error) {
    if (error instanceof BusinessError) {
      return ResponseUtil.error(c, error.message, error.code)
    }
    return ResponseUtil.error(c, '注册失败', 'REGISTRATION_FAILED')
  }
})

// 登录路由
auth.post('/login', async (c) => {
  try {
    // 验证请求数据
    const data = await c.req.json()
    const validatedData = loginSchema.parse(data)
    
    // 调用服务
    const result = await getAuthService(c).login(validatedData)
    
    return ResponseUtil.success(c, result)
  } catch (error) {
    if (error instanceof BusinessError) {
      return ResponseUtil.error(c, error.message, error.code)
    }
    return ResponseUtil.error(c, '登录失败', 'LOGIN_FAILED')
  }
})

// 刷新令牌路由
auth.post('/refresh', async (c) => {
  try {
    // 验证请求数据
    const data = await c.req.json()
    const validatedData = refreshTokenSchema.parse(data)
    
    // 调用服务
    const result = await getAuthService(c).refreshToken(validatedData.refreshToken)
    
    return ResponseUtil.success(c, result)
  } catch (error) {
    if (error instanceof BusinessError) {
      return ResponseUtil.error(c, error.message, error.code)
    }
    return ResponseUtil.error(c, '刷新令牌失败', 'REFRESH_TOKEN_FAILED')
  }
})

// 登出路由
auth.post('/logout', async (c) => {
  try {
    // 调用服务
    const result = await getAuthService(c).logout()
    
    return ResponseUtil.success(c, result)
  } catch (error) {
    if (error instanceof BusinessError) {
      return ResponseUtil.error(c, error.message, error.code)
    }
    return ResponseUtil.error(c, '登出失败', 'LOGOUT_FAILED')
  }
})

export default auth 