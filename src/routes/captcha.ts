import { Hono } from 'hono'
import { z } from 'zod'
import { Env } from '../types/env'
import { generateCaptcha, createCaptchaStore } from '../utils/captcha'
import { BusinessError } from '../errors/error.types'
import { ServiceFactory } from '../services/service.factory'

// 创建路由实例
const captcha = new Hono<{ Bindings: Env }>()

// 验证码请求参数验证
const verifyCaptchaSchema = z.object({
  key: z.string().min(1, '验证码标识不能为空'),
  captcha: z.string().min(4, '验证码长度不能小于4位').max(4, '验证码长度不能大于4位')
})

/**
 * 生成验证码
 * GET /api/captcha/generate
 */
captcha.get('/generate', async (c) => {
  try {
    // 获取客户端IP地址
    const ipAddress = c.req.header('CF-Connecting-IP') ?? 
                     c.req.header('X-Forwarded-For') ?? 
                     c.req.header('X-Real-IP') ?? 
                     'unknown'
    
    // 创建服务工厂并获取IP服务实例
    const serviceFactory = new ServiceFactory(c.env)
    const ipService = serviceFactory.getIpService()
    
    // 检查IP是否被封禁
    const isBanned = await ipService.isIpBanned(ipAddress)
    
    if (isBanned) {
      return c.json({
        success: false,
        message: '您的IP已被封禁，请稍后再试',
        code: 'IP_BANNED'
      }, 403)
    }
    
    // 记录IP请求
    const ipResult = await ipService.recordIp({ ip_address: ipAddress })
    
    // 如果IP被封禁，返回封禁信息
    if (ipResult.data.is_banned) {
      return c.json({
        success: false,
        message: '请求频率过高，您的IP已被临时封禁',
        code: 'IP_BANNED',
        data: {
          ban_reason: ipResult.data.ban_reason,
          ban_expires_at: ipResult.data.ban_expires_at
        }
      }, 403)
    }
    
    // 生成随机验证码
    const captchaText = generateCaptcha()
    
    // 生成唯一标识（使用时间戳和随机数）
    const key = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`
    
    // 创建验证码存储实例
    const captchaStore = createCaptchaStore(c.env)
    
    // 存储验证码，设置5分钟过期
    await captchaStore.set(key, captchaText, 300)
    
    // 返回验证码标识和验证码内容
    return c.json({
      success: true,
      data: {
        key,
        captcha: captchaText
      }
    })
  } catch (error) {
    if (error instanceof BusinessError) {
      throw error
    }
    return c.json({
      success: false,
      message: '生成验证码失败',
      code: 'CAPTCHA_GENERATION_FAILED'
    }, 500)
  }
})

/**
 * 验证验证码
 * POST /api/captcha/verify
 */
captcha.post('/verify', async (c) => {
  try {
    // 获取客户端IP地址
    const ipAddress = c.req.header('CF-Connecting-IP') ?? 
                     c.req.header('X-Forwarded-For') ?? 
                     c.req.header('X-Real-IP') ?? 
                     'unknown'
    
    // 创建服务工厂并获取IP服务实例
    const serviceFactory = new ServiceFactory(c.env)
    const ipService = serviceFactory.getIpService()
    
    // 检查IP是否被封禁
    const isBanned = await ipService.isIpBanned(ipAddress)
    
    if (isBanned) {
      return c.json({
        success: false,
        message: '您的IP已被封禁，请稍后再试',
        code: 'IP_BANNED'
      }, 403)
    }
    
    // 记录IP请求
    const ipResult = await ipService.recordIp({ ip_address: ipAddress })
    
    // 如果IP被封禁，返回封禁信息
    if (ipResult.data.is_banned) {
      return c.json({
        success: false,
        message: '请求频率过高，您的IP已被临时封禁',
        code: 'IP_BANNED',
        data: {
          ban_reason: ipResult.data.ban_reason,
          ban_expires_at: ipResult.data.ban_expires_at
        }
      }, 403)
    }
    
    // 解析请求体
    const body = await c.req.json()
    
    // 验证请求参数
    const { key, captcha } = verifyCaptchaSchema.parse(body)
    
    // 创建验证码存储实例
    const captchaStore = createCaptchaStore(c.env)
    
    // 获取存储的验证码
    const storedCaptcha = await captchaStore.get(key)
    
    // 验证码不存在或已过期
    if (!storedCaptcha) {
      return c.json({
        success: false,
        message: '验证码已过期或不存在',
        code: 'CAPTCHA_EXPIRED'
      }, 400)
    }
    
    // 验证码验证（不区分大小写）
    const isValid = captcha.toLowerCase() === storedCaptcha.toLowerCase()
    
    // 验证成功后删除验证码
    if (isValid) {
      await captchaStore.delete(key)
    }
    
    return c.json({
      success: true,
      data: {
        valid: isValid
      }
    })
  } catch (error) {
    // 参数验证错误
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        message: '参数验证失败',
        errors: error.errors,
        code: 'VALIDATION_ERROR'
      }, 400)
    }
    
    // 其他错误
    return c.json({
      success: false,
      message: '验证码验证失败',
      code: 'VERIFICATION_FAILED'
    }, 500)
  }
})

export default captcha 