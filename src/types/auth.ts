import { z } from 'zod'

/**
 * 用户角色枚举
 */
export enum UserRole {
  USER = 'user',
  SUBSCRIBER = 'subscriber',
  ADMIN = 'admin'
}

/**
 * 用户注册请求参数验证
 */
export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码长度不能小于6位'),
  name: z.string().optional(),
  bio: z.string().optional(),
  captchaKey: z.string().min(1, '验证码标识不能为空'),
  captcha: z.string().min(4, '验证码长度不能小于4位').max(4, '验证码长度不能大于4位')
})

/**
 * 用户登录请求参数验证
 */
export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码长度不能小于6位'),
  captchaKey: z.string().min(1, '验证码标识不能为空'),
  captcha: z.string().min(4, '验证码长度不能小于4位').max(4, '验证码长度不能大于4位')
})

/**
 * 刷新令牌请求参数验证
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, '刷新令牌不能为空')
})

/**
 * 用户注册请求参数类型
 */
export type RegisterRequest = z.infer<typeof registerSchema>

/**
 * 用户登录请求参数类型
 */
export type LoginRequest = z.infer<typeof loginSchema>

/**
 * 刷新令牌请求参数类型
 */
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>

/**
 * 用户类型
 */
export interface User {
  id: number
  email: string
  password: string
  name?: string
  bio?: string
  role: UserRole
  created_at: string
  updated_at: string
}

/**
 * 用户信息类型（不包含敏感信息）
 */
export interface UserInfo {
  id: number
  email: string
  name?: string
  bio?: string
  role: UserRole
}

/**
 * 认证响应类型
 */
export interface AuthResponse {
  success: boolean
  data: {
    accessToken: string
    refreshToken?: string
    user: UserInfo
  }
}

/**
 * 刷新令牌响应类型
 */
export interface RefreshTokenResponse {
  success: boolean
  data: {
    accessToken: string
    user: UserInfo
  }
}

/**
 * JWT 载荷类型
 */
export interface TokenPayload {
  userId: number
  type: 'access' | 'refresh'
  exp?: number
  iat?: number
} 