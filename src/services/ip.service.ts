import { Env } from '../types/env'
import { CreateIpRecordRequest, IpRecordResponse } from '../types/ip'
import { BusinessError } from '../errors/error.types'

/**
 * IP记录服务类
 * 处理IP地址记录和封禁相关操作
 */
export class IpService {
  constructor(private readonly env: Env) {}

  /**
   * 记录IP地址请求
   * @param data IP记录请求数据
   * @returns IP记录结果
   */
  async recordIp(data: CreateIpRecordRequest): Promise<IpRecordResponse> {
    try {
      // 检查IP是否被封禁
      const bannedRecord = await this.env.DB.prepare(`
        SELECT is_banned, ban_reason, ban_expires_at
        FROM ip_records
        WHERE ip_address = ? AND is_banned = TRUE
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(data.ip_address).first()

      // 如果IP被封禁且未过期，返回封禁信息
      const banExpiresAt = bannedRecord?.ban_expires_at as string | undefined;
      const banReason = bannedRecord?.ban_reason as string | undefined;
      
      if (banExpiresAt && new Date(banExpiresAt) > new Date()) {
        return {
          success: true,
          data: {
            ip_address: data.ip_address,
            is_banned: true,
            ban_reason: banReason,
            ban_expires_at: banExpiresAt
          }
        }
      }

      // 记录IP请求
      const result = await this.env.DB.prepare(`
        INSERT INTO ip_records (ip_address, request_time, created_at, updated_at)
        VALUES (?, datetime('now'), datetime('now'), datetime('now'))
      `).bind(data.ip_address).run()

      if (!result.success) {
        throw new BusinessError('IP记录失败', 'IP_RECORD_FAILED')
      }

      // 检查IP请求频率
      const recentRequests = await this.env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM ip_records
        WHERE ip_address = ? AND request_time > datetime('now', '-1 hour')
      `).bind(data.ip_address).first()

      // 如果1小时内请求超过10次，自动封禁24小时
      const requestCount = recentRequests?.count as number | undefined;
      if (requestCount && requestCount > 10) {
        await this.env.DB.prepare(`
          UPDATE ip_records
          SET is_banned = TRUE, ban_reason = '请求频率过高', ban_expires_at = datetime('now', '+24 hours')
          WHERE ip_address = ? AND is_banned = FALSE
        `).bind(data.ip_address).run()

        return {
          success: true,
          data: {
            ip_address: data.ip_address,
            is_banned: true,
            ban_reason: '请求频率过高',
            ban_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        }
      }

      return {
        success: true,
        data: {
          ip_address: data.ip_address,
          is_banned: false
        }
      }
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error
      }
      throw new BusinessError('IP记录失败', 'IP_RECORD_FAILED')
    }
  }

  /**
   * 检查IP是否被封禁
   * @param ipAddress IP地址
   * @returns 是否被封禁
   */
  async isIpBanned(ipAddress: string): Promise<boolean> {
    try {
      const bannedRecord = await this.env.DB.prepare(`
        SELECT is_banned, ban_expires_at
        FROM ip_records
        WHERE ip_address = ? AND is_banned = TRUE
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(ipAddress).first()

      if (!bannedRecord) {
        return false
      }

      // 如果封禁已过期，自动解除封禁
      const banExpiresAt = bannedRecord.ban_expires_at as string | undefined;
      if (banExpiresAt && new Date(banExpiresAt) <= new Date()) {
        await this.env.DB.prepare(`
          UPDATE ip_records
          SET is_banned = FALSE, ban_reason = NULL, ban_expires_at = NULL
          WHERE ip_address = ? AND is_banned = TRUE
        `).bind(ipAddress).run()
        return false
      }

      return true
    } catch (error) {
      console.error('检查IP封禁状态失败:', error)
      return false
    }
  }
} 