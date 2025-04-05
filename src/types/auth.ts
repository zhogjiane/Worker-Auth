import { z } from 'zod'

/**
 * 用户角色枚举
 */
export const UserRoleEnum = {
  USER: 'USER',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  EDITOR: 'EDITOR'
} as const

export type UserRoleEnum = typeof UserRoleEnum[keyof typeof UserRoleEnum]

/**
 * 用户注册请求参数验证
 */
export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码长度不能小于6位'),
  name: z.string().optional(),
  bio: z.string().optional(),
  turnstileToken: z.string().min(1, 'Turnstile token 不能为空')
})

/**
 * 用户登录请求参数验证
 */
export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码长度不能小于6位'),
  turnstileToken: z.string().min(1, 'Turnstile token 不能为空')
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
  username: string
  email: string
  passwordHash: string
  role: UserRoleEnum
  createdAt: Date
  updatedAt: Date
  lastLogin?: Date
  isActive: boolean
  inviteCode?: string
  verificationStatus: string
}

/**
 * 扩展的用户类型（包含角色和权限信息）
 */
export interface ExtendedUser extends User {
  roles?: string[]
  permissions?: string[]
}

/**
 * 用户信息类型（不包含敏感信息）
 */
export interface UserInfo {
  id: number
  email: string
  name?: string
  bio?: string
  role: UserRoleEnum
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
 * 令牌载荷类型
 */
export interface TokenPayload extends Record<string, any> {
  sub: string
  email: string
  role: UserRoleEnum
  permissions?: string[]
  iat?: number
  exp?: number
}

/**
 * 角色类型
 */
export interface Role {
  id: number
  name: string
  description: string | null
  createdAt: Date
}

/**
 * 权限类型
 */
export interface Permission {
  id: number
  name: string
  description?: string
  createdAt: Date
}

/**
 * 用户角色关联类型
 */
export interface UserRole {
  id: number
  user_id: number
  role_id: number
  created_at: string
}

/**
 * 角色权限关联类型
 */
export interface RolePermission {
  id: number
  role_id: number
  permission_id: number
  created_at: string
}

/**
 * 角色创建请求参数验证
 */
export const createRoleSchema = z.object({
  name: z.string().min(1, '角色名称不能为空'),
  description: z.string().optional()
})

/**
 * 角色创建请求参数类型
 */
export type CreateRoleRequest = z.infer<typeof createRoleSchema>

/**
 * 角色更新请求参数验证
 */
export const updateRoleSchema = z.object({
  name: z.string().min(1, '角色名称不能为空').optional(),
  description: z.string().optional()
})

/**
 * 角色更新请求参数类型
 */
export type UpdateRoleRequest = z.infer<typeof updateRoleSchema>

/**
 * 角色响应类型
 */
export interface RoleResponse {
  success: boolean
  data: Role
}

/**
 * 角色列表响应类型
 */
export interface RoleListResponse {
  success: boolean
  data: {
    items: Role[]
    pagination: {
      total: number
      page: number
      page_size: number
      total_pages: number
    }
  }
}

/**
 * 权限响应类型
 */
export interface PermissionResponse {
  success: boolean
  data: Permission
}

/**
 * 权限列表响应类型
 */
export interface PermissionListResponse {
  success: boolean
  data: {
    items: Permission[]
    pagination: {
      total: number
      page: number
      page_size: number
      total_pages: number
    }
  }
}

/**
 * 分配角色请求参数验证
 */
export const assignRoleSchema = z.object({
  userId: z.number().int('用户ID必须为整数'),
  roleName: z.nativeEnum(UserRoleEnum, {
    errorMap: () => ({ message: '无效的角色名称' })
  })
})

/**
 * 分配角色请求参数类型
 */
export type AssignRoleRequest = z.infer<typeof assignRoleSchema>

/**
 * 分配权限请求参数验证
 */
export const assignPermissionSchema = z.object({
  permissionId: z.number().int('权限ID必须为整数')
})

/**
 * 分配权限请求参数类型
 */
export type AssignPermissionRequest = z.infer<typeof assignPermissionSchema>

/**
 * 权限创建请求参数验证
 */
export const createPermissionSchema = z.object({
  name: z.string().min(1, '权限名称不能为空'),
  description: z.string().optional()
})

/**
 * 权限创建请求参数类型
 */
export type CreatePermissionRequest = z.infer<typeof createPermissionSchema>

/**
 * 权限更新请求参数验证
 */
export const updatePermissionSchema = z.object({
  name: z.string().min(1, '权限名称不能为空').optional(),
  description: z.string().optional()
})

/**
 * 权限更新请求参数类型
 */
export type UpdatePermissionRequest = z.infer<typeof updatePermissionSchema> 