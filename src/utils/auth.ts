import * as jose from 'jose'
import { Env } from '../types/env'

/**
 * 生成随机盐值
 * @returns 16字节的随机盐值
 */
async function generateSalt(): Promise<string> {
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
 * @param userId 用户ID
 * @param env 环境变量
 * @returns 访问令牌
 */
export async function generateAccessToken(userId: number, env: Env): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET)
  const alg = 'HS256'

  return new jose.SignJWT({ userId })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret)
}

/**
 * 生成刷新令牌
 * @param userId 用户ID
 * @param env 环境变量
 * @returns 刷新令牌
 */
export async function generateRefreshToken(userId: number, env: Env): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET)
  const alg = 'HS256'

  return new jose.SignJWT({ userId })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

/**
 * 验证令牌
 * @param token JWT令牌
 * @param env 环境变量
 * @returns 解码后的令牌数据
 */
export async function verifyToken(token: string, env: Env): Promise<jose.JWTPayload> {
  const secret = new TextEncoder().encode(env.JWT_SECRET)
  const { payload } = await jose.jwtVerify(token, secret)
  return payload
}

// 生成随机验证码
export function generateCaptcha(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
} 