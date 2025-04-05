import { Context, Next } from 'hono'
import { Env } from '../types/env'
import { AuthenticationError, AuthorizationError } from '../errors/error.types'
import { TokenPayload } from '../types/auth'
import * as jose from 'jose'

// 定义上下文变量类型
interface Variables {
  user: TokenPayload
}

/**
 * 认证中间件
 * 验证 JWT 令牌并设置用户信息
 */
export const authMiddleware = async (c: Context<{ Bindings: Env, Variables: Variables }>, next: Next) => {
  try {
    // 获取 Authorization 头
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('未提供有效的认证令牌', 'MISSING_TOKEN')
    }

    // 提取令牌
    const token = authHeader.split(' ')[1]

    // 验证令牌
    const payload = await verifyToken(token, c.env.JWT_SECRET)

    // 设置用户信息
    c.set('user', payload)

    await next()
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error
    }
    throw new AuthenticationError('无效的认证令牌', 'INVALID_TOKEN')
  }
}

/**
 * 角色验证中间件
 * 验证用户是否具有指定角色
 */
export const roleMiddleware = (roles: string[]) => {
  return async (c: Context<{ Bindings: Env, Variables: Variables }>, next: Next) => {
    try {
      const user = c.get('user')

      // 检查用户是否具有所需角色
      const hasRole = roles.some(role => user.role === role)
      if (!hasRole) {
        throw new AuthorizationError('没有足够的权限执行此操作', 'INSUFFICIENT_ROLE')
      }

      await next()
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error
      }
      throw new AuthorizationError('角色验证失败', 'ROLE_VERIFICATION_FAILED')
    }
  }
}

/**
 * 权限验证中间件
 * 验证用户是否具有指定权限
 */
export const permissionMiddleware = (permissions: string[]) => {
  return async (c: Context<{ Bindings: Env, Variables: Variables }>, next: Next) => {
    try {
      const user = c.get('user')

      // 检查用户是否具有所需权限
      const hasPermission = permissions.some(permission => 
        user.permissions?.includes(permission)
      )
      
      if (!hasPermission) {
        throw new AuthorizationError('没有足够的权限执行此操作', 'INSUFFICIENT_PERMISSION')
      }

      await next()
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error
      }
      throw new AuthorizationError('权限验证失败', 'PERMISSION_VERIFICATION_FAILED')
    }
  }
}

/**
 * 验证令牌
 * @param token JWT令牌
 * @param secret JWT密钥
 * @returns 解码后的令牌数据
 */
async function verifyToken(token: string, secret: string): Promise<TokenPayload> {
  const secretKey = new TextEncoder().encode(secret)
  const { payload } = await jose.jwtVerify(token, secretKey)
  return payload as TokenPayload
} 