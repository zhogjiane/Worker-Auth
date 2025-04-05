import { Context } from 'hono'
import { AuthService } from '../services/auth.service'
import { UserCreateInput, UserUpdateInput } from '../types/user'
import { getUserIdFromToken } from '../utils/auth'
import { LoginRequest } from '../types/auth'

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户注册
   * @param ctx 请求上下文
   * @param env 环境变量
   */
  async register(ctx: Context, env: any) {
    const input = await ctx.req.json<UserCreateInput>()
    const user = await this.authService.register(input)
    return ctx.json(user)
  }

  /**
   * 用户登录
   * @param ctx 请求上下文
   * @param env 环境变量
   */
  async login(ctx: Context, env: any) {
    const input = await ctx.req.json<LoginRequest>()
    const token = await this.authService.login(input)
    return ctx.json(token)
  }

  /**
   * 刷新令牌
   */
  async refreshToken(ctx: Context) {
    const { refresh_token } = await ctx.req.json<{ refresh_token: string }>()
    const token = await this.authService.refreshToken(refresh_token)
    return ctx.json(token)
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(ctx: Context) {
    const userId = await getUserIdFromToken(ctx)
    if (!userId) {
      return ctx.json({ error: '未授权访问' }, 401)
    }
    const user = await this.authService.getUserById(userId)
    return ctx.json(user)
  }

  /**
   * 更新用户信息
   */
  async updateUser(ctx: Context) {
    const userId = await getUserIdFromToken(ctx)
    if (!userId) {
      return ctx.json({ error: '未授权访问' }, 401)
    }
    const input = await ctx.req.json<UserUpdateInput>()
    const user = await this.authService.updateUser(userId, input)
    return ctx.json(user)
  }

  /**
   * 修改密码
   */
  async changePassword(ctx: Context) {
    const userId = await getUserIdFromToken(ctx)
    if (!userId) {
      return ctx.json({ error: '未授权访问' }, 401)
    }
    const { oldPassword, newPassword } = await ctx.req.json<{
      oldPassword: string
      newPassword: string
    }>()

    // 验证旧密码
    const isValid = await this.authService.verifyPassword(userId, oldPassword)
    if (!isValid) {
      ctx.status(400)
      return ctx.json({ message: '旧密码错误' })
    }

    // 更新密码
    const updatedUser = await this.authService.updateUser(userId, {
      password: newPassword
    })

    return ctx.json(updatedUser)
  }
} 