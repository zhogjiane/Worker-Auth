import { BaseEntity, BaseCreateInput, BaseUpdateInput } from './common'

/**
 * 标签实体
 */
export interface Tag extends BaseEntity {
  name: string
}

/**
 * 创建标签输入
 */
export interface TagCreateInput extends BaseCreateInput {
  name: string
}

/**
 * 更新标签输入
 */
export interface TagUpdateInput extends BaseUpdateInput {
  name?: string
} 