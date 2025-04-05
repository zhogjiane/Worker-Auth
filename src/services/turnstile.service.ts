import { Env } from '../types/env'
import { BusinessError } from '../errors/error.types'

/**
 * Turnstile 验证响应类型
 */
interface TurnstileResponse {
  success: boolean
  'error-codes'?: string[]
  'challenge_ts'?: string
  hostname?: string
}

/**
 * Turnstile 服务类
 * 处理 Cloudflare Turnstile 验证
 */
export class TurnstileService {
  constructor(private readonly env: Env) {}

  /**
   * 验证 Turnstile token
   * @param token Turnstile token
   * @param ipAddress 客户端 IP 地址
   * @returns 验证结果
   */
  async verifyToken(token: string, ipAddress: string): Promise<boolean> {
    try {
      // 构建验证请求
      const formData = new FormData()
      formData.append('secret', this.env.TURNSTILE_SECRET_KEY)
      formData.append('response', token)
      formData.append('remoteip', ipAddress)

      // 发送验证请求到 Cloudflare
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData
      })

      // 解析响应
      const result: TurnstileResponse = await response.json()

      // 检查验证结果
      if (!result.success) {
        throw new BusinessError('Turnstile 验证失败', 'TURNSTILE_VERIFICATION_FAILED')
      }

      return true
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error
      }
      throw new BusinessError('Turnstile 验证服务异常', 'TURNSTILE_SERVICE_ERROR')
    }
  }
} 