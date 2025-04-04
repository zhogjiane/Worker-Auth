import { Env } from '../types/env'

/**
 * 生成随机验证码
 * @param length 验证码长度，默认为4
 * @returns 生成的验证码
 */
export function generateCaptcha(length: number = 4): string {
  // 定义可能的字符集（只包含英文字母）
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  let result = ''
  
  // 生成指定长度的随机字符串
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length)
    result += chars[randomIndex]
  }
  
  return result
}

/**
 * 验证码存储接口
 */
export interface CaptchaStore {
  /**
   * 存储验证码
   * @param key 存储键
   * @param captcha 验证码
   * @param ttl 过期时间（秒）
   */
  set(key: string, captcha: string, ttl: number): Promise<void>
  
  /**
   * 获取验证码
   * @param key 存储键
   * @returns 存储的验证码，如果不存在或已过期则返回null
   */
  get(key: string): Promise<string | null>
  
  /**
   * 删除验证码
   * @param key 存储键
   */
  delete(key: string): Promise<void>
}

/**
 * KV 验证码存储实现
 */
export class KVCaptchaStore implements CaptchaStore {
  constructor(private readonly env: Env) {}
  
  async set(key: string, captcha: string, ttl: number): Promise<void> {
    // 使用 KV 存储验证码，设置过期时间
    await this.env.CAPTCHA_KV.put(key, captcha, {
      expirationTtl: ttl
    })
  }
  
  async get(key: string): Promise<string | null> {
    // 从 KV 存储获取验证码
    return await this.env.CAPTCHA_KV.get(key)
  }
  
  async delete(key: string): Promise<void> {
    // 从 KV 存储删除验证码
    await this.env.CAPTCHA_KV.delete(key)
  }
}

/**
 * 创建验证码存储实例
 */
export function createCaptchaStore(env: Env): CaptchaStore {
  return new KVCaptchaStore(env)
} 