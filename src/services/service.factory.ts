import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { DbSchema } from '../db'
import { AuthService } from './auth.service'
import { UserService } from './user.service'
import { RoleService } from './role.service'
import { PermissionService } from './permission.service'
import { ArticleService } from './article.service'
import { CommentService } from './comment.service'
import { TurnstileService } from './turnstile.service'
import { Env } from '../types/env'

/**
 * 服务工厂接口
 * 定义获取各种服务实例的方法
 */
export interface IServiceFactory {
  getAuthService(): AuthService
  getTurnstileService(): TurnstileService
  getRoleService(): RoleService
  getPermissionService(): PermissionService
  getArticleService(): ArticleService
  getCommentService(): CommentService
}

/**
 * 服务工厂类
 * 用于创建和管理所有服务实例
 */
export class ServiceFactory implements IServiceFactory {
  private static instance: ServiceFactory
  private readonly services: Map<string, any> = new Map()

  private constructor(
    private readonly env: Env,
    private readonly drizzle: DrizzleD1Database<DbSchema>
  ) {
    // 初始化角色服务（因为 AuthService 需要它）
    const roleService = new RoleService(env, drizzle)
    
    // 注册服务
    this.registerService('auth', new AuthService(env, roleService, drizzle))
    this.registerService('user', new UserService(drizzle))
    this.registerService('role', roleService)
    this.registerService('permission', new PermissionService(env, drizzle))
    this.registerService('article', new ArticleService(env, drizzle))
    this.registerService('comment', new CommentService(env, drizzle))
    this.registerService('turnstile', new TurnstileService(env))
  }

  /**
   * 获取服务工厂实例
   */
  public static getInstance(env: Env, drizzle: DrizzleD1Database<DbSchema>): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory(env, drizzle)
    }
    return ServiceFactory.instance
  }

  /**
   * 注册服务
   */
  private registerService<T>(name: string, service: T): void {
    this.services.set(name, service)
  }

  /**
   * 获取服务实例
   */
  public getService<T>(name: string): T {
    const service = this.services.get(name)
    if (!service) {
      throw new Error(`Service ${name} not found`)
    }
    return service as T
  }

  /**
   * 获取角色服务实例
   */
  public getRoleService(): RoleService {
    return this.getService('role')
  }

  /**
   * 获取权限服务实例
   */
  public getPermissionService(): PermissionService {
    return this.getService('permission')
  }

  /**
   * 获取认证服务实例
   */
  public getAuthService(): AuthService {
    return this.getService('auth')
  }

  /**
   * 获取Turnstile服务实例
   */
  public getTurnstileService(): TurnstileService {
    return this.getService('turnstile')
  }

  /**
   * 获取文章服务实例
   */
  public getArticleService(): ArticleService {
    return this.getService('article')
  }

  /**
   * 获取评论服务实例
   */
  public getCommentService(): CommentService {
    return this.getService('comment')
  }
} 