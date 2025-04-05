import { BaseEntity, StatusEntity, AuthorEntity, BaseCreateInput, BaseUpdateInput } from './common'

/**
 * 评论状态
 */
export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/**
 * 评论实体
 */
export interface Comment extends BaseEntity, StatusEntity<CommentStatus>, AuthorEntity {
  content: string
  articleId: number
  parentId: number | null
  upVotes?: number
  downVotes?: number
}

/**
 * 创建评论输入
 */
export interface CommentCreateInput extends BaseCreateInput {
  content: string
  article_id: number
  parent_id?: number
}

/**
 * 更新评论输入
 */
export interface CommentUpdateInput extends BaseUpdateInput {
  content: string
}

/**
 * 评论投票类型
 */
export type VoteType = 'UP' | 'DOWN'

/**
 * 评论投票记录
 */
export interface CommentVote extends BaseEntity {
  commentId: number
  userId: number
  voteType: VoteType
}

/**
 * 评论举报原因
 */
export type ReportReason = 'SPAM' | 'ABUSE' | 'OFFENSIVE' | 'OTHER'

/**
 * 评论举报记录
 */
export interface CommentReport extends BaseEntity {
  commentId: number
  reporterId: number
  reason: ReportReason
  description?: string
}

/**
 * 评论统计信息
 */
export interface CommentStatistics {
  totalComments: number
  pendingComments: number
  approvedComments: number
  rejectedComments: number
  averageCommentsPerArticle: number
  topCommenters: Array<{
    userId: number
    username: string
    commentCount: number
  }>
  recentReports: Array<{
    commentId: number
    reportCount: number
    reasons: string[]
  }>
} 