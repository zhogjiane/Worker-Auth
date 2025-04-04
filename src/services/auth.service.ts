import { Env } from '../types/env'
import { LoginRequest, RegisterRequest, AuthResponse, TokenPayload, User, UserRole } from '../types/auth'
import { BusinessError, NotFoundError, AuthenticationError } from '../errors/error.types'
import { createCaptchaStore } from '../utils/captcha'
import { IpService } from './ip.service'
import { hashPassword, verifyPassword } from '../utils/auth'

/**
 * 认证服务类
 * 处理用户注册、登录、登出等认证相关操作
 */
export class AuthService {
  private readonly ipService: IpService

  constructor(private readonly env: Env) {
    this.ipService = new IpService(env)
  }

  /**
   * 用户注册
   * @param data 注册请求数据
   * @param ipAddress 客户端IP地址
   * @returns 注册结果
   */
  async register(data: RegisterRequest, ipAddress: string): Promise<AuthResponse> {
    try {
      // 检查IP是否被封禁
      const isBanned = await this.ipService.isIpBanned(ipAddress)
      
      if (isBanned) {
        throw new BusinessError('您的IP已被封禁，请稍后再试', 'IP_BANNED')
      }
      
      // 记录IP请求
      const ipResult = await this.ipService.recordIp({ ip_address: ipAddress })
      
      // 如果IP被封禁，返回封禁信息
      if (ipResult.data.is_banned) {
        throw new BusinessError('请求频率过高，您的IP已被临时封禁', 'IP_BANNED')
      }
      
      // 验证验证码
      const captchaStore = createCaptchaStore(this.env)
      const storedCaptcha = await captchaStore.get(data.captchaKey)
      
      if (!storedCaptcha) {
        throw new BusinessError('验证码已过期或不存在', 'CAPTCHA_EXPIRED')
      }
      
      if (data.captcha.toLowerCase() !== storedCaptcha.toLowerCase()) {
        throw new BusinessError('验证码错误', 'CAPTCHA_INVALID')
      }
      
      // 验证成功后删除验证码
      await captchaStore.delete(data.captchaKey)
      
      // 检查邮箱是否已注册
      const existingUser = await this.env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(data.email).first()
      
      if (existingUser) {
        throw new BusinessError('该邮箱已被注册', 'EMAIL_EXISTS')
      }
      
      // 对密码进行哈希处理
      const hashedPassword = await hashPassword(data.password)
      
      // 创建新用户
      const result = await this.env.DB.prepare(`
        INSERT INTO users (email, password, name, bio, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        data.email,
        hashedPassword, // 使用哈希后的密码
        data.name ?? null,
        data.bio ?? null,
        UserRole.USER
      ).run()
      
      if (!result.success) {
        throw new BusinessError('注册失败', 'REGISTER_FAILED')
      }
      
      // 生成访问令牌和刷新令牌
      const userId = result.meta.last_row_id
      const accessToken = await this.generateAccessToken(userId)
      const refreshToken = await this.generateRefreshToken(userId)
      
      // 获取用户信息
      const userResult = await this.env.DB.prepare(`
        SELECT id, email, name, bio, role
        FROM users
        WHERE id = ?
      `).bind(userId).first()
      
      const user = userResult as unknown as User
      
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
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error
      }
      throw new BusinessError('注册失败', 'REGISTER_FAILED')
    }
  }

  /**
   * 用户登录
   * @param data 登录请求数据
   * @param ipAddress 客户端IP地址
   * @returns 登录结果
   */
  async login(data: LoginRequest, ipAddress: string): Promise<AuthResponse> {
    try {
      // 检查IP是否被封禁
      const isBanned = await this.ipService.isIpBanned(ipAddress)
      
      if (isBanned) {
        throw new BusinessError('您的IP已被封禁，请稍后再试', 'IP_BANNED')
      }
      
      // 记录IP请求
      const ipResult = await this.ipService.recordIp({ ip_address: ipAddress })
      
      // 如果IP被封禁，返回封禁信息
      if (ipResult.data.is_banned) {
        throw new BusinessError('请求频率过高，您的IP已被临时封禁', 'IP_BANNED')
      }
      
      // 验证验证码
      const captchaStore = createCaptchaStore(this.env)
      const storedCaptcha = await captchaStore.get(data.captchaKey)
      
      if (!storedCaptcha) {
        throw new BusinessError('验证码已过期或不存在', 'CAPTCHA_EXPIRED')
      }
      
      if (data.captcha.toLowerCase() !== storedCaptcha.toLowerCase()) {
        throw new BusinessError('验证码错误', 'CAPTCHA_INVALID')
      }
      
      // 验证成功后删除验证码
      await captchaStore.delete(data.captchaKey)
      
      // 查找用户
      const userResult = await this.env.DB.prepare(`
        SELECT id, email, password, name, bio, role
        FROM users
        WHERE email = ?
      `).bind(data.email).first()
      
      if (!userResult) {
        throw new NotFoundError('用户不存在', 'USER_NOT_FOUND')
      }
      
      // 类型转换
      const user = userResult as unknown as User
      
      // 验证密码
      const isPasswordValid = await verifyPassword(data.password, user.password)
      if (!isPasswordValid) {
        throw new AuthenticationError('密码错误', 'INVALID_PASSWORD')
      }
      
      // 生成访问令牌和刷新令牌
      const accessToken = await this.generateAccessToken(user.id)
      const refreshToken = await this.generateRefreshToken(user.id)
      
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
    } catch (error) {
      if (error instanceof BusinessError || 
          error instanceof NotFoundError || 
          error instanceof AuthenticationError) {
        throw error
      }
      throw new BusinessError('登录失败', 'LOGIN_FAILED')
    }
  }

  /**
   * 刷新访问令牌
   * @param refreshToken 刷新令牌
   * @returns 新的访问令牌
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      // 验证刷新令牌
      const payload = await this.verifyToken(refreshToken)
      
      // 查找用户
      const userResult = await this.env.DB.prepare(`
        SELECT id, email, name, bio, role
        FROM users
        WHERE id = ?
      `).bind(payload.userId).first()
      
      if (!userResult) {
        throw new NotFoundError('用户不存在', 'USER_NOT_FOUND')
      }
      
      // 类型转换
      const user = userResult as unknown as User
      
      // 生成新的访问令牌
      const accessToken = await this.generateAccessToken(user.id)
      
      return {
        success: true,
        data: {
          accessToken,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            bio: user.bio,
            role: user.role
          }
        }
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new AuthenticationError('无效的刷新令牌', 'INVALID_REFRESH_TOKEN')
    }
  }

  /**
   * 用户登出
   * @returns 登出结果
   */
  async logout(): Promise<{ success: boolean }> {
    return { success: true }
  }

  /**
   * 生成访问令牌
   * @param userId 用户ID
   * @returns 访问令牌
   */
  private async generateAccessToken(userId: number): Promise<string> {
    const payload: TokenPayload = {
      userId,
      type: 'access'
    }
    
    return await this.env.JWT.sign(payload, {
      expiresIn: '1h'
    })
  }

  /**
   * 生成刷新令牌
   * @param userId 用户ID
   * @returns 刷新令牌
   */
  private async generateRefreshToken(userId: number): Promise<string> {
    const payload: TokenPayload = {
      userId,
      type: 'refresh'
    }
    
    return await this.env.JWT.sign(payload, {
      expiresIn: '7d'
    })
  }

  /**
   * 验证令牌
   * @param token JWT令牌
   * @returns 令牌载荷
   */
  private async verifyToken(token: string): Promise<TokenPayload> {
    try {
      const payload = await this.env.JWT.verify(token)
      return payload as TokenPayload
    } catch (error) {
      throw new AuthenticationError('无效的令牌', 'INVALID_TOKEN')
    }
  }
} 