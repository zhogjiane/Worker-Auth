import { Env } from '../types/env'
import {  CreateRoleRequest, UpdateRoleRequest, RoleResponse, RoleListResponse, UserRoleEnum } from '../types/auth'
import { BusinessError, NotFoundError, ValidationError } from '../errors/error.types'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { DbSchema } from '../db'
import { roles, userRoles, rolePermissions } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'

/**
 * 角色服务类
 * 处理角色的增删改查等操作
 */
export class RoleService {
  // 使用 any 类型暂时解决类型问题
  private getRoleByIdStmt: any | null = null
  private getRoleByNameStmt: any | null = null
  private getRolesStmt: any | null = null
  private getRolesCountStmt: any | null = null
  private getUserRolesStmt: any | null = null
  private getRolePermissionsStmt: any | null = null

  constructor(
    private readonly env: Env,
    private readonly drizzle: DrizzleD1Database<DbSchema>
  ) {}

  /**
   * 懒加载初始化 getRoleById prepared statement
   */
  private initGetRoleByIdStmt() {
    if (!this.getRoleByIdStmt) {
      this.getRoleByIdStmt = this.drizzle
        .select({
          id: roles.id,
          name: roles.name,
          description: roles.description,
          createdAt: roles.createdAt
        })
        .from(roles)
        .where(eq(roles.id, sql.placeholder('id')))
        .limit(1)
        .prepare()
    }
    return this.getRoleByIdStmt
  }

  /**
   * 懒加载初始化 getRoleByName prepared statement
   */
  private initGetRoleByNameStmt() {
    if (!this.getRoleByNameStmt) {
      this.getRoleByNameStmt = this.drizzle
        .select({
          id: roles.id,
          name: roles.name,
          description: roles.description,
          createdAt: roles.createdAt
        })
        .from(roles)
        .where(eq(roles.name, sql.placeholder('name')))
        .limit(1)
        .prepare()
    }
    return this.getRoleByNameStmt
  }

  /**
   * 懒加载初始化 getRoles prepared statement
   */
  private initGetRolesStmt() {
    if (!this.getRolesStmt) {
      this.getRolesStmt = this.drizzle
        .select({
          id: roles.id,
          name: roles.name,
          description: roles.description,
          createdAt: roles.createdAt
        })
        .from(roles)
        .orderBy(sql`${sql.placeholder('sortField')} ${sql.placeholder('sortOrder')}`)
        .limit(sql.placeholder('limit'))
        .offset(sql.placeholder('offset'))
        .prepare()
    }
    return this.getRolesStmt
  }

  /**
   * 懒加载初始化 getRolesCount prepared statement
   */
  private initGetRolesCountStmt() {
    if (!this.getRolesCountStmt) {
      this.getRolesCountStmt = this.drizzle
        .select({ count: sql<number>`count(*)` })
        .from(roles)
        .prepare()
    }
    return this.getRolesCountStmt
  }

  /**
   * 懒加载初始化 getUserRoles prepared statement
   */
  private initGetUserRolesStmt() {
    if (!this.getUserRolesStmt) {
      this.getUserRolesStmt = this.drizzle
        .select({
          name: roles.name
        })
        .from(roles)
        .innerJoin(userRoles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, sql.placeholder('userId')))
        .prepare()
    }
    return this.getUserRolesStmt
  }

  /**
   * 懒加载初始化 getRolePermissions prepared statement
   */
  private initGetRolePermissionsStmt() {
    if (!this.getRolePermissionsStmt) {
      this.getRolePermissionsStmt = this.drizzle
        .select({
          name: sql<string>`p.name`
        })
        .from(roles)
        .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
        .innerJoin(sql`permissions p`, eq(rolePermissions.permissionId, sql`p.id`))
        .where(eq(roles.name, sql.placeholder('roleName')))
        .prepare()
    }
    return this.getRolePermissionsStmt
  }

  /**
   * 创建角色
   * @param data 角色创建请求数据
   * @returns 创建的角色信息
   */
  async createRole(data: CreateRoleRequest): Promise<RoleResponse> {
    try {
      // 检查角色名是否已存在
      const stmt = this.initGetRoleByNameStmt()
      const existingRole = await stmt.execute({ name: data.name })

      if (existingRole.length > 0) {
        throw new BusinessError('角色名已存在', 'ROLE_NAME_EXISTS')
      }

      // 创建角色
      const [role] = await this.drizzle
        .insert(roles)
        .values({
          name: data.name,
          description: data.description ?? null
        })
        .returning({
          id: roles.id,
          name: roles.name,
          description: roles.description,
          createdAt: roles.createdAt
        })

      return {
        success: true,
        data: role
      }
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error
      }
      throw new BusinessError('创建角色失败', 'ROLE_CREATION_FAILED')
    }
  }

  /**
   * 更新角色
   * @param id 角色ID
   * @param data 角色更新请求数据
   * @returns 更新后的角色信息
   */
  async updateRole(id: number, data: UpdateRoleRequest): Promise<RoleResponse> {
    try {
      // 检查角色是否存在
      const stmt = this.initGetRoleByIdStmt()
      const existingRole = await stmt.execute({ id })

      if (!existingRole[0]) {
        throw new NotFoundError('角色不存在', 'ROLE_NOT_FOUND')
      }

      // 检查新角色名是否与其他角色冲突
      if (data.name) {
        const nameStmt = this.initGetRoleByNameStmt()
        const nameConflict = await nameStmt.execute({ name: data.name })
        
        if (nameConflict.length > 0 && nameConflict[0].id !== id) {
          throw new BusinessError('角色名已存在', 'ROLE_NAME_EXISTS')
        }
      }

      // 更新角色
      const [role] = await this.drizzle
        .update(roles)
        .set({
          name: data.name ?? undefined,
          description: data.description ?? undefined
        })
        .where(eq(roles.id, id))
        .returning({
          id: roles.id,
          name: roles.name,
          description: roles.description,
          createdAt: roles.createdAt
        })

      return {
        success: true,
        data: role
      }
    } catch (error) {
      if (error instanceof BusinessError || error instanceof NotFoundError) {
        throw error
      }
      throw new BusinessError('更新角色失败', 'ROLE_UPDATE_FAILED')
    }
  }

  /**
   * 删除角色
   * @param id 角色ID
   * @returns 删除结果
   */
  async deleteRole(id: number): Promise<{ success: boolean }> {
    try {
      // 检查角色是否存在
      const stmt = this.initGetRoleByIdStmt()
      const existingRole = await stmt.execute({ id })

      if (!existingRole[0]) {
        throw new NotFoundError('角色不存在', 'ROLE_NOT_FOUND')
      }

      // 删除角色
      await this.drizzle
        .delete(roles)
        .where(eq(roles.id, id))

      return { success: true }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new BusinessError('删除角色失败', 'ROLE_DELETION_FAILED')
    }
  }

  /**
   * 获取角色列表
   * @param page 页码
   * @param pageSize 每页数量
   * @param sort 排序字段
   * @param order 排序方向
   * @returns 角色列表
   */
  async getRoles(
    page: number = 1,
    pageSize: number = 20,
    sort: string = 'name',
    order: 'asc' | 'desc' = 'asc'
  ): Promise<RoleListResponse> {
    try {
      // 验证排序字段
      const allowedSortFields = ['name', 'createdAt']
      if (!allowedSortFields.includes(sort)) {
        throw new ValidationError('无效的排序字段', 'INVALID_SORT_FIELD')
      }
      
      // 验证排序方向
      if (order !== 'asc' && order !== 'desc') {
        throw new ValidationError('无效的排序方向', 'INVALID_SORT_ORDER')
      }

      // 计算偏移量
      const offset = (page - 1) * pageSize

      // 获取角色总数
      const countStmt = this.initGetRolesCountStmt()
      const [{ count }] = await countStmt.execute({})

      // 获取角色列表
      const stmt = this.initGetRolesStmt()
      const items = await stmt.execute({
        sortField: sort,
        sortOrder: order,
        limit: pageSize,
        offset
      })

      return {
        success: true,
        data: {
          items,
          pagination: {
            total: Number(count),
            page,
            page_size: pageSize,
            total_pages: Math.ceil(Number(count) / pageSize)
          }
        }
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      throw new BusinessError('获取角色列表失败', 'GET_ROLES_FAILED')
    }
  }

  /**
   * 获取角色详情
   * @param id 角色ID
   * @returns 角色详情
   */
  async getRole(id: number): Promise<RoleResponse> {
    try {
      // 获取角色详情
      const stmt = this.initGetRoleByIdStmt()
      const [role] = await stmt.execute({ id })

      if (!role) {
        throw new NotFoundError('角色不存在', 'ROLE_NOT_FOUND')
      }

      return {
        success: true,
        data: role
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new BusinessError('获取角色详情失败', 'ROLE_RETRIEVAL_FAILED')
    }
  }

  /**
   * 获取用户的角色列表
   * @param userId 用户ID
   * @returns 角色名称列表
   */
  async getUserRoles(userId: number): Promise<string[]> {
    try {
      const stmt = this.initGetUserRolesStmt()
      const result = await stmt.execute({ userId })

      return result.map((role: { name: string }) => role.name)
    } catch (error) {
      console.error('获取用户角色失败:', error)
      return []
    }
  }

  /**
   * 获取角色的权限列表
   * @param roleName 角色名称
   * @returns 权限名称列表
   */
  async getRolePermissions(roleName: string): Promise<string[]> {
    try {
      const stmt = this.initGetRolePermissionsStmt()
      const result = await stmt.execute({ roleName })

      return result.map((permission: { name: string }) => permission.name)
    } catch (error) {
      console.error('获取角色权限失败:', error)
      return []
    }
  }

  /**
   * 为用户分配角色
   * @param userId 用户ID
   * @param roleName 角色名称
   */
  async assignRoleToUser(userId: number, roleName: UserRoleEnum): Promise<void> {
    try {
      // 检查角色是否存在
      const stmt = this.initGetRoleByNameStmt()
      const [role] = await stmt.execute({ name: roleName })

      if (!role) {
        throw new NotFoundError('角色不存在', 'ROLE_NOT_FOUND')
      }

      // 检查用户是否已有该角色
      const [existingRole] = await this.drizzle
        .select()
        .from(userRoles)
        .where(and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, role.id)
        ))
        .limit(1)

      if (existingRole) {
        throw new BusinessError('用户已拥有该角色', 'ROLE_ALREADY_ASSIGNED')
      }

      // 分配角色
      await this.drizzle
        .insert(userRoles)
        .values({
          userId,
          roleId: role.id
        })
    } catch (error) {
      if (error instanceof BusinessError || error instanceof NotFoundError) {
        throw error
      }
      throw new BusinessError('分配角色失败', 'ROLE_ASSIGNMENT_FAILED')
    }
  }

  /**
   * 移除用户的角色
   * @param userId 用户ID
   * @param roleName 角色名称
   */
  async removeRoleFromUser(userId: number, roleName: UserRoleEnum): Promise<void> {
    try {
      // 检查角色是否存在
      const stmt = this.initGetRoleByNameStmt()
      const [role] = await stmt.execute({ name: roleName })

      if (!role) {
        throw new NotFoundError('角色不存在', 'ROLE_NOT_FOUND')
      }

      // 移除角色
      await this.drizzle
        .delete(userRoles)
        .where(and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, role.id)
        ))
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error
      }
      throw new BusinessError('移除角色失败', 'ROLE_REMOVAL_FAILED')
    }
  }
}