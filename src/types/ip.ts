import { z } from 'zod'

/**
 * IP记录类型
 */
export interface IpRecord {
  id: number
  ip_address: string
  request_time: string
  is_banned: boolean
  ban_reason?: string
  ban_expires_at?: string
  created_at: string
  updated_at: string
}

/**
 * IP记录创建参数验证
 */
export const createIpRecordSchema = z.object({
  ip_address: z.string().min(1, 'IP地址不能为空')
})

/**
 * IP记录创建参数类型
 */
export type CreateIpRecordRequest = z.infer<typeof createIpRecordSchema>

/**
 * IP记录响应类型
 */
export interface IpRecordResponse {
  success: boolean
  data: {
    ip_address: string
    is_banned: boolean
    ban_reason?: string
    ban_expires_at?: string
  }
} 