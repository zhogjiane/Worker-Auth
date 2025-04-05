import { UserRoleEnum } from './auth'
import { BaseEntity, StatusEntity, VerificationEntity } from './common'

/**
 * 用户类型
 */
export interface User extends BaseEntity, StatusEntity<UserRoleEnum>, VerificationEntity {
  email: string
  username: string
  passwordHash: string
  role: UserRoleEnum
  lastLogin?: Date
  inviteCode?: string
}

/**
 * 用户创建输入类型
 */
export interface UserCreateInput {
  email: string
  username: string
  password: string
  role?: UserRoleEnum
}

/**
 * 用户更新输入类型
 */
export interface UserUpdateInput {
  email?: string
  username?: string
  password?: string
  role?: UserRoleEnum
  isActive?: boolean
  verificationStatus?: string
}

/**
 * 用户令牌类型
 */
export interface UserToken {
  access_token: string
  refresh_token: string
  expires_in: number
} 