import { Hono } from 'hono'
import { z } from 'zod'
import { registerSchema, loginSchema, refreshTokenSchema } from '../types/auth'
import { ValidationError } from '../errors/error.types'
import { Env } from '../types/env'
import { ServiceFactory } from '../services/service.factory'

// 创建路由实例
const auth = new Hono<{ Bindings: Env }>()

/**
 * 用户注册
 * POST /api/auth/register
 */
auth.post('/register', async (c) => {
  try {
    // 获取客户端IP地址
    const ipAddress = c.req.header('CF-Connecting-IP') ?? 
                     c.req.header('X-Forwarded-For') ?? 
                     c.req.header('X-Real-IP') ?? 
                     'unknown'
    
    // 解析请求体
    const body = await c.req.json()
    
    // 验证请求参数
    const data = registerSchema.parse(body)
    
    // 创建服务工厂并获取认证服务实例
    const serviceFactory = new ServiceFactory(c.env)
    const authService = serviceFactory.getAuthService()
    
    // 调用注册服务
    const result = await authService.register(data, ipAddress)
    
    return c.json(result)
  } catch (error) {
    // 参数验证错误
    if (error instanceof z.ZodError) {
      throw new ValidationError('参数验证失败', error.errors)
    }
    throw error
  }
})

/**
 * 用户登录
 * POST /api/auth/login
 */
auth.post('/login', async (c) => {
  try {
    // 获取客户端IP地址
    const ipAddress = c.req.header('CF-Connecting-IP') ?? 
                     c.req.header('X-Forwarded-For') ?? 
                     c.req.header('X-Real-IP') ?? 
                     'unknown'
    
    // 解析请求体
    const body = await c.req.json()
    
    // 验证请求参数
    const data = loginSchema.parse(body)
    
    // 创建服务工厂并获取认证服务实例
    const serviceFactory = new ServiceFactory(c.env)
    const authService = serviceFactory.getAuthService()
    
    // 调用登录服务
    const result = await authService.login(data, ipAddress)
    
    return c.json(result)
  } catch (error) {
    // 参数验证错误
    if (error instanceof z.ZodError) {
      throw new ValidationError('参数验证失败', error.errors)
    }
    throw error
  }
})

/**
 * 刷新访问令牌
 * POST /api/auth/refresh
 */
auth.post('/refresh', async (c) => {
  try {
    // 解析请求体
    const body = await c.req.json()
    
    // 验证请求参数
    const data = refreshTokenSchema.parse(body)
    
    // 创建服务工厂并获取认证服务实例
    const serviceFactory = new ServiceFactory(c.env)
    const authService = serviceFactory.getAuthService()
    
    // 调用刷新令牌服务
    const result = await authService.refreshToken(data.refreshToken)
    
    return c.json(result)
  } catch (error) {
    // 参数验证错误
    if (error instanceof z.ZodError) {
      throw new ValidationError('参数验证失败', error.errors)
    }
    throw error
  }
})

/**
 * 用户登出
 * POST /api/auth/logout
 */
auth.post('/logout', async (c) => {
  try {
    // 创建服务工厂并获取认证服务实例
    const serviceFactory = new ServiceFactory(c.env)
    const authService = serviceFactory.getAuthService()
    
    // 调用登出服务
    const result = await authService.logout()
    
    return c.json(result)
  } catch (error) {
    // 记录错误并重新抛出
    console.error('登出失败:', error)
    throw error
  }
})

export default auth 