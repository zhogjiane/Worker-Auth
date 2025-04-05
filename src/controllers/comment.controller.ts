import { Context } from 'hono'
import { CommentService } from '../services/comment.service'
import { CommentCreateInput, CommentUpdateInput, CommentStatus, VoteType, ReportReason } from '../types/comment'
import { getUserIdFromToken } from '../utils/auth'

export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  /**
   * 获取文章评论列表
   */
  async getArticleComments(ctx: Context) {
    const articleId = Number(ctx.req.param('articleId'))
    const page = Number(ctx.req.query('page')) || 1
    const pageSize = Number(ctx.req.query('pageSize')) || 10
    const status = ctx.req.query('status') as CommentStatus

    const result = await this.commentService.getArticleComments(articleId, page, pageSize, status)
    return ctx.json(result)
  }

  /**
   * 创建评论
   */
  async createComment(ctx: Context) {
    const userId = await getUserIdFromToken(ctx)
    if (!userId) {
      return ctx.json({ error: '未授权访问' }, 401)
    }
    const input = await ctx.req.json<CommentCreateInput>()
    const comment = await this.commentService.createComment(input, userId)
    return ctx.json(comment)
  }

  /**
   * 更新评论
   */
  async updateComment(ctx: Context) {
    const id = Number(ctx.req.param('id'))
    const input = await ctx.req.json<CommentUpdateInput>()
    const comment = await this.commentService.updateComment(id, input)
    return ctx.json(comment)
  }

  /**
   * 删除评论
   */
  async deleteComment(ctx: Context) {
    const id = Number(ctx.req.param('id'))
    await this.commentService.deleteComment(id)
    return ctx.json({ message: '删除成功' })
  }

  /**
   * 更新评论状态
   */
  async updateCommentStatus(ctx: Context) {
    const id = Number(ctx.req.param('id'))
    const { status } = await ctx.req.json<{ status: CommentStatus }>()
    await this.commentService.updateCommentStatus(id, status)
    return ctx.json({ message: '更新成功' })
  }

  /**
   * 评论投票
   */
  async voteComment(ctx: Context) {
    const userId = await getUserIdFromToken(ctx)
    if (!userId) {
      return ctx.json({ error: '未授权访问' }, 401)
    }
    const id = Number(ctx.req.param('id'))
    const { vote_type } = await ctx.req.json<{ vote_type: VoteType }>()
    await this.commentService.voteComment(id, userId, vote_type)
    return ctx.json({ message: '投票成功' })
  }

  /**
   * 举报评论
   */
  async reportComment(ctx: Context) {
    const userId = await getUserIdFromToken(ctx)
    if (!userId) {
      return ctx.json({ error: '未授权访问' }, 401)
    }
    const id = Number(ctx.req.param('id'))
    const { reason, description } = await ctx.req.json<{
      reason: ReportReason
      description?: string
    }>()
    await this.commentService.reportComment(id, userId, reason, description)
    return ctx.json({ message: '举报成功' })
  }

  /**
   * 获取评论统计信息
   */
  async getStatistics(ctx: Context) {
    const stats = await this.commentService.getStatistics()
    return ctx.json(stats)
  }
} 