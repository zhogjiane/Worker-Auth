import { Env } from '../types/env'
import { CreatePermissionRequest, UpdatePermissionRequest, PermissionResponse, PermissionListResponse } from '../types/auth'
import { BusinessError, NotFoundError, ValidationError } from '../errors/error.types'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { DbSchema } from '../db'
import { permissions } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'

/**
 * 权限服务类
 * 处理权限的增删改查等操作
 */
export class PermissionService {
  // 使用 any 类型暂时解决类型问题
  private getPermissionByIdStmt: any | null = null
  private getPermissionByNameStmt: any | null = null
  private getPermissionsStmt: any | null = null
  private getPermissionsCountStmt: any | null = null

  constructor(
    private readonly env: Env,
    private readonly drizzle: DrizzleD1Database<DbSchema>
  ) {}

  /**
   * 懒加载初始化 getPermissionById prepared statement
   */
  private initGetPermissionByIdStmt() {
    if (!this.getPermissionByIdStmt) {
      this.getPermissionByIdStmt = this.drizzle
        .select()
        .from(permissions)
        .where(eq(permissions.id, sql.placeholder('id')))
        .limit(1)
        .prepare()
    }
    return this.getPermissionByIdStmt
  }

  /**
   * 懒加载初始化 getPermissionByName prepared statement
   */
  private initGetPermissionByNameStmt() {
    if (!this.getPermissionByNameStmt) {
      this.getPermissionByNameStmt = this.drizzle
        .select()
        .from(permissions)
        .where(eq(permissions.name, sql.placeholder('name')))
        .limit(1)
        .prepare()
    }
    return this.getPermissionByNameStmt
  }

  /**
   * 懒加载初始化 getPermissions prepared statement
   */
  private initGetPermissionsStmt() {
    if (!this.getPermissionsStmt) {
      this.getPermissionsStmt = this.drizzle
        .select()
        .from(permissions)
        .orderBy(sql`${sql.placeholder('sortField')} ${sql.placeholder('sortOrder')}`)
        .limit(sql.placeholder('limit'))
        .offset(sql.placeholder('offset'))
        .prepare()
    }
    return this.getPermissionsStmt
  }

  /**
   * 懒加载初始化 getPermissionsCount prepared statement
   */
  private initGetPermissionsCountStmt() {
    if (!this.getPermissionsCountStmt) {
      this.getPermissionsCountStmt = this.drizzle
        .select({ count: sql<number>`count(*)` })
        .from(permissions)
        .prepare()
    }
    return this.getPermissionsCountStmt
  }

  /**
   * 创建权限
   * @param data 权限创建请求数据
   * @returns 创建的权限
   */
  async createPermission(data: CreatePermissionRequest): Promise<PermissionResponse> {
    try {
      // 检查权限名是否已存在
      const stmt = this.initGetPermissionByNameStmt()
      const existingPermission = await stmt.execute({ name: data.name })
      
      if (existingPermission[0]) {
        throw new BusinessError('权限名已存在', 'PERMISSION_NAME_EXISTS')
      }
      
      // 创建权限
      const [permission] = await this.drizzle
        .insert(permissions)
        .values({
          name: data.name,
          description: data.description ?? null
        })
        .returning()
      
      return {
        success: true,
        data: {
          id: permission.id,
          name: permission.name,
          description: permission.description ?? undefined,
          createdAt: permission.createdAt
        }
      }
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error
      }
      throw new BusinessError('创建权限失败', 'PERMISSION_CREATION_FAILED')
    }
  }

  /**
   * 更新权限
   * @param id 权限ID
   * @param data 权限更新请求数据
   * @returns 更新后的权限
   */
  async updatePermission(id: number, data: UpdatePermissionRequest): Promise<PermissionResponse> {
    try {
      // 检查权限是否存在
      const stmt = this.initGetPermissionByIdStmt()
      const existingPermission = await stmt.execute({ id })
      
      if (!existingPermission[0]) {
        throw new NotFoundError('权限不存在', 'PERMISSION_NOT_FOUND')
      }
      
      // 检查权限名是否已存在
      if (data.name) {
        const nameStmt = this.initGetPermissionByNameStmt()
        const existingName = await nameStmt.execute({ name: data.name })
        
        if (existingName[0] && existingName[0].id !== id) {
          throw new BusinessError('权限名已存在', 'PERMISSION_NAME_EXISTS')
        }
      }
      
      // 更新权限
      const [permission] = await this.drizzle
        .update(permissions)
        .set({
          name: data.name,
          description: data.description
        })
        .where(eq(permissions.id, id))
        .returning()
      
      return {
        success: true,
        data: {
          id: permission.id,
          name: permission.name,
          description: permission.description ?? undefined,
          createdAt: permission.createdAt
        }
      }
    } catch (error) {
      if (error instanceof BusinessError || error instanceof NotFoundError || error instanceof ValidationError) {
        throw error
      }
      throw new BusinessError('更新权限失败', 'PERMISSION_UPDATE_FAILED')
    }
  }

  /**
   * 删除权限
   * @param id 权限ID
   * @returns 删除结果
   */
  async deletePermission(id: number): Promise<{ success: boolean }> {
    try {
      // 检查权限是否存在
      const stmt = this.initGetPermissionByIdStmt()
      const existingPermission = await stmt.execute({ id })
      
      if (!existingPermission[0]) {
        throw new NotFoundError('权限不存在', 'PERMISSION_NOT_FOUND')
      }
      
      // 删除权限
      await this.drizzle.delete(permissions).where(eq(permissions.id, id))
      
      return { success: true }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new BusinessError('删除权限失败', 'PERMISSION_DELETION_FAILED')
    }
  }

  /**
   * 获取权限列表
   * @param page 页码
   * @param pageSize 每页数量
   * @param sort 排序字段
   * @param order 排序方向
   * @returns 权限列表
   */
  async getPermissions(
    page: number = 1,
    pageSize: number = 20,
    sort: string = 'name',
    order: 'asc' | 'desc' = 'asc'
  ): Promise<PermissionListResponse> {
    try {
      // 验证页码
      if (page < 1) {
        throw new ValidationError('页码必须大于0', 'INVALID_PAGE_NUMBER')
      }
      
      // 验证每页数量
      if (pageSize < 1) {
        throw new ValidationError('每页数量必须大于0', 'INVALID_PAGE_SIZE')
      }
      
      // 验证排序字段
      if (!['id', 'name', 'createdAt'].includes(sort)) {
        throw new ValidationError('无效的排序字段', 'INVALID_SORT_FIELD')
      }
      
      // 验证排序方向
      if (order !== 'asc' && order !== 'desc') {
        throw new ValidationError('无效的排序方向', 'INVALID_SORT_ORDER')
      }
      
      // 计算偏移量
      const offset = (page - 1) * pageSize
      
      // 获取总记录数
      const countStmt = this.initGetPermissionsCountStmt()
      const total = await countStmt.execute({})
      
      // 获取权限列表
      const stmt = this.initGetPermissionsStmt()
      const items = await stmt.execute({
        sortField: sort,
        sortOrder: order,
        limit: pageSize,
        offset
      })
      
      return {
        success: true,
        data: {
          items: items.map((permission: any) => ({
            id: permission.id,
            name: permission.name,
            description: permission.description ?? undefined,
            createdAt: permission.createdAt
          })),
          pagination: {
            total: total[0].count,
            page,
            page_size: pageSize,
            total_pages: Math.ceil(total[0].count / pageSize)
          }
        }
      }
    } catch (error) {
      if (error instanceof BusinessError || error instanceof ValidationError) {
        throw error
      }
      throw new BusinessError('获取权限列表失败', 'PERMISSION_LIST_RETRIEVAL_FAILED')
    }
  }

  /**
   * 获取权限详情
   * @param id 权限ID
   * @returns 权限详情
   */
  async getPermission(id: number): Promise<PermissionResponse> {
    try {
      // 获取权限
      const stmt = this.initGetPermissionByIdStmt()
      const permission = await stmt.execute({ id })
      
      if (!permission[0]) {
        throw new NotFoundError('权限不存在', 'PERMISSION_NOT_FOUND')
      }
      
      return {
        success: true,
        data: {
          id: permission[0].id,
          name: permission[0].name,
          description: permission[0].description ?? undefined,
          createdAt: permission[0].createdAt
        }
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new BusinessError('获取权限详情失败', 'PERMISSION_RETRIEVAL_FAILED')
    }
  }
} 