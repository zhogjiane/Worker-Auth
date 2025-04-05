/**
 * 基础实体接口
 * @template T - ID类型
 */
export interface BaseEntity<T = number> {
  id: T
  createdAt: Date
  updatedAt: Date
}

/**
 * 分页查询参数接口
 */
export interface PaginationQueryParams {
  page?: number
  limit?: number
}

/**
 * 分页结果接口
 * @template T - 数据类型
 */
export interface PaginationResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * 基础创建输入接口
 * @template T - 字段值类型
 */
export type BaseCreateInput<T = any> = Record<string, T>

/**
 * 基础更新输入接口
 * @template T - 字段值类型
 */
export type BaseUpdateInput<T = any> = Partial<Record<string, T>>

/**
 * 带状态的基础实体接口
 * @template T - 状态类型
 * @template ID - ID类型
 */
export interface StatusEntity<T, ID = number> extends BaseEntity<ID> {
  status: T
  isActive: boolean
}

/**
 * 带作者信息的基础实体接口
 * @template ID - ID类型
 */
export interface AuthorEntity<ID = number> extends BaseEntity<ID> {
  authorId: number
  authorName: string | null
}

/**
 * 带验证状态的基础实体接口
 * @template ID - ID类型
 */
export interface VerificationEntity<ID = number> extends BaseEntity<ID> {
  verificationStatus: string
  isVerified: boolean
} 