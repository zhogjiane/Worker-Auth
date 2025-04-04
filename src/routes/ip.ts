import { Hono } from 'hono'
import { z } from 'zod'
import { Env } from '../types/env'
import { ValidationError } from '../errors/error.types'
import { createIpRecordSchema } from '../types/ip'
import { ServiceFactory } from '../services/service.factory'

// 创建路由实例
const ip = new Hono<{ Bindings: Env }>()

/**
 * 记录IP地址
 * POST /api/ip/record
 */
ip.post('/record', async (c) => {
  try {
    // 获取客户端IP地址
    const ipAddress = c.req.header('CF-Connecting-IP') ?? 
                     c.req.header('X-Forwarded-For') ?? 
                     c.req.header('X-Real-IP') ?? 
                     'unknown'
    
    // 解析请求体
    const body = await c.req.json()
    
    // 验证请求参数
    const data = createIpRecordSchema.parse({
      ...body,
      ip_address: ipAddress
    })
    
    // 创建服务工厂并获取IP服务实例
    const serviceFactory = new ServiceFactory(c.env)
    const ipService = serviceFactory.getIpService()
    
    // 调用IP记录服务
    const result = await ipService.recordIp(data)
    
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
 * 检查IP是否被封禁
 * GET /api/ip/check/:ip
 */
ip.get('/check/:ip', async (c) => {
  try {
    const ipAddress = c.req.param('ip')
    
    // 创建服务工厂并获取IP服务实例
    const serviceFactory = new ServiceFactory(c.env)
    const ipService = serviceFactory.getIpService()
    
    // 调用IP检查服务
    const isBanned = await ipService.isIpBanned(ipAddress)
    
    return c.json({
      success: true,
      data: {
        ip_address: ipAddress,
        is_banned: isBanned
      }
    })
  } catch (error) {
    // 记录错误并重新抛出
    console.error('检查IP封禁状态失败:', error)
    throw error
  }
})

export default ip 