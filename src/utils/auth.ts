import * as jose from 'jose'
import { User, TokenPayload, UserRoleEnum } from '../types/auth'
import { Context } from 'hono'

/**
 * 生成随机盐值
 * @returns 16字节的随机盐值
 */
export async function generateSalt(): Promise<string> {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * 使用 PBKDF2 进行密码哈希
 * @param password 原始密码
 * @returns 哈希后的密码字符串 (格式: salt:hash)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await generateSalt()
  const encoder = new TextEncoder()
  const passwordData = encoder.encode(password)
  const saltData = encoder.encode(salt)
  
  const key = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  )
  
  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  )
  
  const hashArray = Array.from(new Uint8Array(hash))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return `${salt}:${hashHex}`
}

/**
 * 验证密码
 * @param password 原始密码
 * @param hashedPassword 哈希后的密码字符串
 * @returns 密码是否匹配
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const [salt, hash] = hashedPassword.split(':')
  const encoder = new TextEncoder()
  const passwordData = encoder.encode(password)
  const saltData = encoder.encode(salt)
  
  const key = await crypto.subtle.importKey(
    'raw',
    passwordData,
    'PBKDF2',
    false,
    ['deriveBits']
  )
  
  const newHash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  )
  
  const newHashArray = Array.from(new Uint8Array(newHash))
  const newHashHex = newHashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return hash === newHashHex
}

/**
 * 生成访问令牌
 * @param user 用户信息
 * @param secret JWT密钥
 * @returns 访问令牌
 */
export async function generateAccessToken(user: User, secret: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)
  const alg = 'HS256'

  const payload: TokenPayload = {
    sub: user.id.toString(),
    email: user.email,
    role: user.role || UserRoleEnum.USER
  }

  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secretKey)
}

/**
 * 生成刷新令牌
 * @param user 用户信息
 * @param secret JWT密钥
 * @returns 刷新令牌
 */
export async function generateRefreshToken(user: User, secret: string): Promise<string> {
  const secretKey = new TextEncoder().encode(secret)
  const alg = 'HS256'

  const payload: TokenPayload = {
    sub: user.id.toString(),
    email: user.email,
    role: user.role || UserRoleEnum.USER
  }

  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey)
}

/**
 * 验证令牌
 * @param token JWT令牌
 * @param secret JWT密钥
 * @returns 解码后的令牌数据
 */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload> {
  const secretKey = new TextEncoder().encode(secret)
  const { payload } = await jose.jwtVerify(token, secretKey)
  return payload as TokenPayload
}

// 生成随机验证码
export function generateCaptcha(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/**
 * 从请求头中获取 JWT token
 */
function getTokenFromHeader(ctx: Context): string | null {
  const authHeader = ctx.req.header('Authorization') ?? null
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

/**
 * 从请求头中获取用户ID
 * @param c Hono上下文
 * @returns 用户ID或null
 */
export const getUserIdFromToken = async (c: Context): Promise<number | null> => {
  const token = await getTokenFromHeader(c)
  if (!token) return null

  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET)
    return payload?.sub ? Number(payload.sub) : null
  } catch (error) {
    console.error('获取用户ID失败:', error)
    return null
  }
}

/**
 * 认证中间件
 */
export async function authMiddleware(ctx: Context, next: () => Promise<void>): Promise<Response | void> {
  try {
    const userId = await getUserIdFromToken(ctx)
    ctx.set('userId', userId)
    return next()
  } catch (error) {
    ctx.status(401)
    return ctx.json({ message: '未授权访问' })
  }
} 