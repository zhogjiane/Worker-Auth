import { randomBytes, scrypt } from 'crypto'
import { sign, verify } from 'jsonwebtoken'
import { User, AuthResponse, TokenPayload } from '../types/auth'
import { Env } from '../types/env'

// 密码加密
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(derivedKey)
    })
  })
  return `${salt}:${key.toString('hex')}`
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(':')
  const keyBuffer = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(derivedKey)
    })
  })
  return key === keyBuffer.toString('hex')
}

// 生成 JWT 令牌
export function generateTokens(user: User, env: Env): AuthResponse {
  const accessToken = sign(
    { userId: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  )

  const refreshToken = sign(
    { userId: user.id, email: user.email },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  return {
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        bio: user.bio,
        role: user.role
      }
    }
  }
}

// 验证 JWT 令牌
export function verifyToken(token: string, env: Env): TokenPayload {
  return verify(token, env.JWT_SECRET) as TokenPayload
}

// 生成随机验证码
export function generateCaptcha(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
} 