import { BaseEntity, StatusEntity, AuthorEntity, PaginationQueryParams, PaginationResult, BaseCreateInput, BaseUpdateInput } from './common'

/**
 * 文章状态
 */
export type ArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

/**
 * 文章实体
 */
export interface Article extends BaseEntity, StatusEntity<ArticleStatus>, AuthorEntity {
  title: string
  content: string
  viewCount: number
  commentCount: number
  publishedAt: Date | null
}

/**
 * 创建文章输入
 */
export interface ArticleCreateInput extends BaseCreateInput {
  title: string
  content: string
}

/**
 * 更新文章输入
 */
export interface ArticleUpdateInput extends BaseUpdateInput {
  title?: string
  content?: string
  status?: ArticleStatus
}

/**
 * 文章查询参数
 */
export interface ArticleQueryParams extends PaginationQueryParams {
  status?: ArticleStatus
  search?: string
}

/**
 * 文章分页结果
 */
export interface ArticlePaginationResult extends PaginationResult<Article> {} 