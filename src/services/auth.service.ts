import { Env } from '../types/env'
import { LoginRequest, UserRoleEnum } from '../types/auth'
import { User, UserCreateInput, UserUpdateInput, UserToken } from '../types/user'
import { TurnstileService } from './turnstile.service'
import { RoleService } from './role.service'
import { PermissionService } from './permission.service'
import { ServiceFactory } from './service.factory'
import { BaseService } from './base.service'
import { verifyPassword } from '../utils/auth'
import { SignJWT, jwtVerify } from 'jose'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { DbSchema } from '../db'
import { users } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { withTransaction, TransactionPropagation } from '../utils/transaction.util'


/**
 * 认证服务类
 * 处理用户注册、登录、登出等认证相关操作
 */
export class AuthService extends BaseService {
  private readonly turnstileService: TurnstileService
  private readonly permissionService: PermissionService

  // TODO: 需要等待 drizzle-orm 类型定义更新，暂时使用 any
  // 这些 prepared statements 的类型应该使用 D1PreparedQuery<typeof users.$inferSelect>
  private getUserByIdStmt: any | null = null
  private getUserByEmailStmt: any | null = null
  private getUserByUsernameStmt: any | null = null
  private getUserByInviteCodeStmt: any | null = null
  private getUserByVerificationStatusStmt: any | null = null
  private getUserByIsActiveStmt: any | null = null
  private getUserByRoleStmt: any | null = null
  private getUserByUsernameAndEmailStmt: any | null = null
  private getUserByUsernameAndRoleStmt: any | null = null
  private getUserByEmailAndRoleStmt: any | null = null

  constructor(
    env: Env,
    private readonly roleService: RoleService,
    private readonly drizzle: DrizzleD1Database<DbSchema>
  ) {
    super(env)
    const serviceFactory = ServiceFactory.getInstance(env, drizzle)
    this.turnstileService = serviceFactory.getTurnstileService()
    this.permissionService = serviceFactory.getPermissionService()
  }

  /**
   * 懒加载初始化 getUserById prepared statement
   */
  private initGetUserByIdStmt() {
    if (!this.getUserByIdStmt) {
      this.getUserByIdStmt = this.drizzle
        .select()
        .from(users)
        .where(eq(users.id, sql.placeholder('id')))
        .limit(1)
        .prepare()
    }
    return this.getUserByIdStmt
  }

  /**
   * 懒加载初始化 getUserByEmail prepared statement
   */
  private initGetUserByEmailStmt() {
    if (!this.getUserByEmailStmt) {
      this.getUserByEmailStmt = this.drizzle
        .select()
        .from(users)
        .where(eq(users.email, sql.placeholder('email')))
        .limit(1)
        .prepare()
    }
    return this.getUserByEmailStmt
  }

  /**
   * 懒加载初始化 getUserByUsername prepared statement
   */
  private initGetUserByUsernameStmt() {
    if (!this.getUserByUsernameStmt) {
      this.getUserByUsernameStmt = this.drizzle
        .select()
        .from(users)
        .where(eq(users.username, sql.placeholder('username')))
        .limit(1)
        .prepare()
    }
    return this.getUserByUsernameStmt
  }

  /**
   * 懒加载初始化 getUserByInviteCode prepared statement
   */
  private initGetUserByInviteCodeStmt() {
    if (!this.getUserByInviteCodeStmt) {
      this.getUserByInviteCodeStmt = this.drizzle
        .select()
        .from(users)
        .where(eq(users.inviteCode, sql.placeholder('inviteCode')))
        .limit(1)
        .prepare()
    }
    return this.getUserByInviteCodeStmt
  }

  /**
   * 懒加载初始化 getUserByVerificationStatus prepared statement
   */
  private initGetUserByVerificationStatusStmt() {
    if (!this.getUserByVerificationStatusStmt) {
      this.getUserByVerificationStatusStmt = this.drizzle
        .select()
        .from(users)
        .where(eq(users.verificationStatus, sql.placeholder('verificationStatus')))
        .limit(1)
        .prepare()
    }
    return this.getUserByVerificationStatusStmt
  }

  /**
   * 懒加载初始化 getUserByIsActive prepared statement
   */
  private initGetUserByIsActiveStmt() {
    if (!this.getUserByIsActiveStmt) {
      this.getUserByIsActiveStmt = this.drizzle
        .select()
        .from(users)
        .where(eq(users.isActive, sql.placeholder('isActive')))
        .limit(1)
        .prepare()
    }
    return this.getUserByIsActiveStmt
  }

  /**
   * 懒加载初始化 getUserByRole prepared statement
   */
  private initGetUserByRoleStmt() {
    if (!this.getUserByRoleStmt) {
      this.getUserByRoleStmt = this.drizzle
        .select()
        .from(users)
        .where(eq(users.role, sql.placeholder('role')))
        .limit(1)
        .prepare()
    }
    return this.getUserByRoleStmt
  }

  /**
   * 懒加载初始化 getUserByUsernameAndEmail prepared statement
   */
  private initGetUserByUsernameAndEmailStmt() {
    if (!this.getUserByUsernameAndEmailStmt) {
      this.getUserByUsernameAndEmailStmt = this.drizzle
        .select()
        .from(users)
        .where(and(
          eq(users.username, sql.placeholder('username')),
          eq(users.email, sql.placeholder('email'))
        ))
        .limit(1)
        .prepare()
    }
    return this.getUserByUsernameAndEmailStmt
  }

  /**
   * 懒加载初始化 getUserByUsernameAndRole prepared statement
   */
  private initGetUserByUsernameAndRoleStmt() {
    if (!this.getUserByUsernameAndRoleStmt) {
      this.getUserByUsernameAndRoleStmt = this.drizzle
        .select()
        .from(users)
        .where(and(
          eq(users.username, sql.placeholder('username')),
          eq(users.role, sql.placeholder('role'))
        ))
        .limit(1)
        .prepare()
    }
    return this.getUserByUsernameAndRoleStmt
  }

  /**
   * 懒加载初始化 getUserByEmailAndRole prepared statement
   */
  private initGetUserByEmailAndRoleStmt() {
    if (!this.getUserByEmailAndRoleStmt) {
      this.getUserByEmailAndRoleStmt = this.drizzle
        .select()
        .from(users)
        .where(and(
          eq(users.email, sql.placeholder('email')),
          eq(users.role, sql.placeholder('role'))
        ))
        .limit(1)
        .prepare()
    }
    return this.getUserByEmailAndRoleStmt
  }

  /**
   * 将数据库用户记录转换为 User 类型
   */
  private convertToUser(dbUser: typeof users.$inferSelect): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      username: dbUser.username,
      passwordHash: dbUser.passwordHash,
      role: UserRoleEnum[dbUser.role as keyof typeof UserRoleEnum],
      createdAt: dbUser.createdAt,
      updatedAt: dbUser.updatedAt,
      lastLogin: dbUser.lastLogin ?? undefined,
      isActive: Boolean(dbUser.isActive),
      inviteCode: dbUser.inviteCode ?? undefined,
      verificationStatus: dbUser.verificationStatus ?? 'pending',
      status: UserRoleEnum[dbUser.role as keyof typeof UserRoleEnum],
      isVerified: dbUser.verificationStatus === 'verified'
    }
  }

  /**
   * 验证用户凭据
   * @param email 用户邮箱
   * @param password 用户密码
   * @returns 用户对象或 null
   */
  private async validateCredentials(email: string, password: string): Promise<User | null> {
    const stmt = this.initGetUserByEmailStmt()
    const [user] = await stmt.execute({ email })

    if (!user) {
      return null
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash)
    if (!isPasswordValid) {
      return null
    }

    return this.convertToUser(user)
  }

  /**
   * 生成访问令牌
   * @param user 用户对象
   * @param roles 用户角色列表
   */
  private async generateAccessToken(user: User, roles: string[]): Promise<string> {
    const secret = new TextEncoder().encode(this.env.JWT_SECRET)
    const token = await new SignJWT({ 
      userId: user.id,
      email: user.email,
      role: user.role,
      roles
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(this.env.JWT_EXPIRES_IN)
      .sign(secret)
    
    return token
  }

  /**
   * 用户注册
   * @param input 用户注册信息
   * @returns 注册成功的用户信息
   */
  register = withTransaction(
    this.drizzle,
    async (input: UserCreateInput): Promise<User> => {
      // 检查邮箱是否已存在
      const emailStmt = this.initGetUserByEmailStmt()
      const [existingUser] = await emailStmt.execute({ email: input.email })
      if (existingUser) {
        throw new Error('邮箱已被注册')
      }

      // 检查用户名是否已存在
      const usernameStmt = this.initGetUserByUsernameStmt()
      const [existingUsername] = await usernameStmt.execute({ username: input.username })
      if (existingUsername) {
        throw new Error('用户名已被使用')
      }

      // 加密密码
      const hashedPassword = await this.hashPassword(input.password)

      // 创建用户
      const [user] = await this.drizzle.insert(users).values({
        username: input.username,
        email: input.email,
        passwordHash: hashedPassword,
        role: UserRoleEnum.USER,
        isActive: true,
        verificationStatus: 'pending'
      }).returning()

      if (!user) {
        throw new Error('用户创建失败')
      }

      return this.convertToUser(user)
    },
    TransactionPropagation.REQUIRED
  );

  /**
   * 用户登录
   */
  async login(loginData: LoginRequest): Promise<{ user: User; token: string }> {
    try {
      // 获取用户信息
      const stmt = this.initGetUserByEmailStmt()
      const [user] = await stmt.execute({ email: loginData.email })

      if (!user) {
        throw new Error('用户不存在')
      }

      // 验证密码
      const isValid = await verifyPassword(loginData.password, user.passwordHash)
      if (!isValid) {
        throw new Error('密码错误')
      }

      const userWithCorrectType = this.convertToUser(user)

      // 生成 token
      const token = await this.generateAccessToken(userWithCorrectType, [])

      return {
        user: userWithCorrectType,
        token
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  /**
   * 验证 token
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      const secret = new TextEncoder().encode(this.env.JWT_SECRET)
      const { payload } = await jwtVerify(token, secret)
      
      if (!payload.userId || typeof payload.userId !== 'number') return null

      const stmt = this.initGetUserByIdStmt()
      const [user] = await stmt.execute({ id: payload.userId })

      if (!user) return null

      return this.convertToUser(user)
    } catch (error) {
      console.error('Token verification error:', error)
      return null
    }
  }

  /**
   * 刷新令牌
   * @param refreshToken 刷新令牌
   * @returns 新的访问令牌和刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<UserToken> {
    try {
      const secret = new TextEncoder().encode(this.env.JWT_REFRESH_SECRET)
      const { payload } = await jwtVerify(refreshToken, secret)
      
      if (!payload.userId) {
        throw new Error('无效的刷新令牌')
      }

      const user = await this.getUserById(payload.userId as number)
      if (!user) {
        throw new Error('用户不存在')
      }

      // 生成新的令牌
      const accessToken = await this.generateAccessToken(user, [])
      const newRefreshToken = await new SignJWT({ userId: user.id })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(this.env.JWT_REFRESH_EXPIRES_IN)
        .sign(new TextEncoder().encode(this.env.JWT_REFRESH_SECRET))

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
        expires_in: parseInt(this.env.JWT_EXPIRES_IN)
      }
    } catch (error) {
      throw new Error('无效的刷新令牌')
    }
  }

  /**
   * 根据ID获取用户信息
   * @param id 用户ID
   * @returns 用户信息
   */
  async getUserById(id: number): Promise<User | null> {
    const stmt = this.initGetUserByIdStmt()
    const [user] = await stmt.execute({ id })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据邮箱获取用户信息
   * @param email 用户邮箱
   * @returns 用户信息
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const stmt = this.initGetUserByEmailStmt()
    const [user] = await stmt.execute({ email })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据用户名获取用户信息
   * @param username 用户名
   * @returns 用户信息
   */
  async getUserByUsername(username: string): Promise<User | null> {
    const stmt = this.initGetUserByUsernameStmt()
    const [user] = await stmt.execute({ username })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据邀请码获取用户信息
   * @param inviteCode 邀请码
   * @returns 用户信息
   */
  async getUserByInviteCode(inviteCode: string): Promise<User | null> {
    const stmt = this.initGetUserByInviteCodeStmt()
    const [user] = await stmt.execute({ inviteCode })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据验证状态获取用户信息
   * @param verificationStatus 验证状态
   * @returns 用户信息
   */
  async getUserByVerificationStatus(verificationStatus: string): Promise<User | null> {
    const stmt = this.initGetUserByVerificationStatusStmt()
    const [user] = await stmt.execute({ verificationStatus })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据激活状态获取用户信息
   * @param isActive 激活状态
   * @returns 用户信息
   */
  async getUserByIsActive(isActive: boolean): Promise<User | null> {
    const stmt = this.initGetUserByIsActiveStmt()
    const [user] = await stmt.execute({ isActive })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据最后登录时间获取用户信息
   * @param lastLogin 最后登录时间
   * @returns 用户信息
   */
  async getUserByLastLogin(lastLogin: Date): Promise<User | null> {
    const user = await this.drizzle.query.users.findFirst({
      where: eq(users.lastLogin, lastLogin)
    })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据创建时间获取用户信息
   * @param createdAt 创建时间
   * @returns 用户信息
   */
  async getUserByCreatedAt(createdAt: Date): Promise<User | null> {
    const user = await this.drizzle.query.users.findFirst({
      where: eq(users.createdAt, createdAt)
    })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据更新时间获取用户信息
   * @param updatedAt 更新时间
   * @returns 用户信息
   */
  async getUserByUpdatedAt(updatedAt: Date): Promise<User | null> {
    const user = await this.drizzle.query.users.findFirst({
      where: eq(users.updatedAt, updatedAt)
    })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 更新用户信息
   * @param id 用户ID
   * @param input 更新信息
   * @returns 更新后的用户信息
   */
  updateUser = withTransaction(
    this.drizzle,
    async (id: number, input: UserUpdateInput): Promise<User> => {
      const updateData: Partial<typeof users.$inferInsert> = {}

      if (input.username) {
        // 检查用户名是否已存在
        const existingUser = await this.drizzle.query.users.findFirst({
          where: eq(users.username, input.username)
        })
        if (existingUser && existingUser.id !== id) {
          throw new Error('用户名已被使用')
        }
        updateData.username = input.username
      }

      if (input.email) {
        // 检查邮箱是否已存在
        const existingUser = await this.drizzle.query.users.findFirst({
          where: eq(users.email, input.email)
        })
        if (existingUser && existingUser.id !== id) {
          throw new Error('邮箱已被注册')
        }
        updateData.email = input.email
      }

      if (input.password) {
        updateData.passwordHash = await this.hashPassword(input.password)
      }

      if (input.role) {
        updateData.role = input.role
      }

      const [updatedUser] = await this.drizzle
        .update(users)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning()

      if (!updatedUser) {
        throw new Error('用户更新失败')
      }

      return this.convertToUser(updatedUser)
    },
    TransactionPropagation.REQUIRED
  );

  /**
   * 验证用户密码
   * @param userId 用户ID
   * @param password 待验证的密码
   * @returns 密码是否正确
   */
  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const user = await this.getUserById(userId)
    if (!user) {
      return false
    }
    return verifyPassword(password, user.passwordHash)
  }

  /**
   * 获取用户角色和权限
   * @param userId 用户ID
   * @returns 用户角色和权限
   */
  async getUserRolesAndPermissions(userId: number): Promise<{ roles: string[]; permissions: string[] }> {
    try {
      // 获取用户角色
      const roles = await this.roleService.getUserRoles(userId)
      
      // 获取角色对应的权限
      const permissions = new Set<string>()
      for (const role of roles) {
        const rolePermissions = await this.roleService.getRolePermissions(role)
        rolePermissions.forEach(permission => permissions.add(permission))
      }
      
      return {
        roles,
        permissions: Array.from(permissions)
      }
    } catch (error) {
      console.error('获取用户角色和权限失败:', error)
      return {
        roles: [],
        permissions: []
      }
    }
  }

  /**
   * 用户登出
   * @returns 登出响应
   */
  async logout(): Promise<{ success: boolean }> {
    return { success: true }
  }

  /**
   * 密码加密
   * @param password 原始密码
   * @returns 加密后的密码
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return btoa(String.fromCharCode(...new Uint8Array(hash)))
  }

  /**
   * 删除用户
   * @param id 用户ID
   * @returns 是否删除成功
   */
  async deleteUser(id: number): Promise<boolean> {
    const [deletedUser] = await this.drizzle
      .delete(users)
      .where(eq(users.id, id))
      .returning()

    return !!deletedUser
  }

  /**
   * 根据角色获取用户信息
   * @param role 角色
   * @returns 用户信息
   */
  async getUserByRole(role: UserRoleEnum): Promise<User | null> {
    const stmt = this.initGetUserByRoleStmt()
    const [user] = await stmt.execute({ role })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据密码哈希获取用户信息
   * @param passwordHash 密码哈希
   * @returns 用户信息
   */
  async getUserByPasswordHash(passwordHash: string): Promise<User | null> {
    const user = await this.drizzle.query.users.findFirst({
      where: eq(users.passwordHash, passwordHash)
    })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据用户名和邮箱获取用户信息
   * @param username 用户名
   * @param email 邮箱
   * @returns 用户信息
   */
  async getUserByUsernameAndEmail(username: string, email: string): Promise<User | null> {
    const stmt = this.initGetUserByUsernameAndEmailStmt()
    const [user] = await stmt.execute({ username, email })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据用户名和密码哈希获取用户信息
   * @param username 用户名
   * @param passwordHash 密码哈希
   * @returns 用户信息
   */
  async getUserByUsernameAndPasswordHash(username: string, passwordHash: string): Promise<User | null> {
    const user = await this.drizzle.query.users.findFirst({
      where: and(
        eq(users.username, username),
        eq(users.passwordHash, passwordHash)
      )
    })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据邮箱和密码哈希获取用户信息
   * @param email 邮箱
   * @param passwordHash 密码哈希
   * @returns 用户信息
   */
  async getUserByEmailAndPasswordHash(email: string, passwordHash: string): Promise<User | null> {
    const user = await this.drizzle.query.users.findFirst({
      where: and(
        eq(users.email, email),
        eq(users.passwordHash, passwordHash)
      )
    })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据用户名和角色获取用户信息
   * @param username 用户名
   * @param role 角色
   * @returns 用户信息
   */
  async getUserByUsernameAndRole(username: string, role: UserRoleEnum): Promise<User | null> {
    const stmt = this.initGetUserByUsernameAndRoleStmt()
    const [user] = await stmt.execute({ username, role })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据邮箱和角色获取用户信息
   * @param email 邮箱
   * @param role 角色
   * @returns 用户信息
   */
  async getUserByEmailAndRole(email: string, role: UserRoleEnum): Promise<User | null> {
    const stmt = this.initGetUserByEmailAndRoleStmt()
    const [user] = await stmt.execute({ email, role })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据密码哈希和角色获取用户信息
   * @param passwordHash 密码哈希
   * @param role 角色
   * @returns 用户信息
   */
  async getUserByPasswordHashAndRole(passwordHash: string, role: UserRoleEnum): Promise<User | null> {
    const user = await this.drizzle.query.users.findFirst({
      where: and(
        eq(users.passwordHash, passwordHash),
        eq(users.role, role)
      )
    })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据用户名、密码哈希和角色获取用户信息
   * @param username 用户名
   * @param passwordHash 密码哈希
   * @param role 角色
   * @returns 用户信息
   */
  async getUserByUsernameAndPasswordHashAndRole(username: string, passwordHash: string, role: UserRoleEnum): Promise<User | null> {
    const user = await this.drizzle.query.users.findFirst({
      where: and(
        eq(users.username, username),
        eq(users.passwordHash, passwordHash),
        eq(users.role, role)
      )
    })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据邮箱、密码哈希和角色获取用户信息
   * @param email 邮箱
   * @param passwordHash 密码哈希
   * @param role 角色
   * @returns 用户信息
   */
  async getUserByEmailAndPasswordHashAndRole(email: string, passwordHash: string, role: UserRoleEnum): Promise<User | null> {
    const user = await this.drizzle.query.users.findFirst({
      where: and(
        eq(users.email, email),
        eq(users.passwordHash, passwordHash),
        eq(users.role, role)
      )
    })
    return user ? this.convertToUser(user) : null
  }

  /**
   * 根据用户名、邮箱和角色获取用户信息
   * @param username 用户名
   * @param email 邮箱
   * @param role 角色
   * @returns 用户信息
   */
  async getUserByUsernameAndEmailAndRole(username: string, email: string, role: UserRoleEnum): Promise<User | null> {
    const user = await this.drizzle.query.users.findFirst({
      where: and(
        eq(users.username, username),
        eq(users.email, email),
        eq(users.role, role)
      )
    })
    return user ? this.convertToUser(user) : null
  }
} 