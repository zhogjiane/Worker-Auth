import { BaseEntity, BaseCreateInput, BaseUpdateInput } from './common'

/**
 * 分类实体
 */
export interface Category extends BaseEntity {
  name: string
  description: string
}

/**
 * 创建分类输入
 */
export interface CategoryCreateInput extends BaseCreateInput {
  name: string
  description: string
}

/**
 * 更新分类输入
 */
export interface CategoryUpdateInput extends BaseUpdateInput {
  name?: string
  description?: string
} 