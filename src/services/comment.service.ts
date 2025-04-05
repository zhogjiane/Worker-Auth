import { Env } from '../types/env'
import { Comment, CommentCreateInput, CommentUpdateInput, CommentStatus, VoteType, ReportReason } from '../types/comment'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { DbSchema } from '../db'
import { comments, users, commentVotes, commentReports } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { withTransaction, TransactionPropagation } from '../utils/transaction.util'

export class CommentService {
  // 使用 PreparedStatement 类型替代 any
  private getStatisticsStmt: PreparedStatement | null = null
  private getArticleCommentsStmt: PreparedStatement | null = null
  private getArticleCommentsCountStmt: PreparedStatement | null = null
  private getCommentByIdStmt: PreparedStatement | null = null
  private getCommentVoteStmt: PreparedStatement | null = null
  private getCommentReportStmt: PreparedStatement | null = null
  private getCommentReportsCountStmt: PreparedStatement | null = null

  constructor(
    private readonly env: Env,
    private readonly drizzle: DrizzleD1Database<DbSchema>
  ) {}

  /**
   * 懒加载初始化 getStatistics prepared statement
   */
  private initGetStatisticsStmt() {
    if (!this.getStatisticsStmt) {
      this.getStatisticsStmt = this.drizzle
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when status = 'PENDING' then 1 else 0 end)`,
          approved: sql<number>`sum(case when status = 'APPROVED' then 1 else 0 end)`,
          rejected: sql<number>`sum(case when status = 'REJECTED' then 1 else 0 end)`,
          reported: sql<number>`sum(case when report_count > 0 then 1 else 0 end)`
        })
        .from(comments)
        .prepare()
    }
    return this.getStatisticsStmt
  }

  /**
   * 懒加载初始化 getArticleComments prepared statement
   */
  private initGetArticleCommentsStmt() {
    if (!this.getArticleCommentsStmt) {
      this.getArticleCommentsStmt = this.drizzle
        .select({
          id: comments.id,
          content: comments.content,
          articleId: comments.articleId,
          authorId: comments.userId,
          parentId: comments.parentId,
          status: comments.status,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          authorName: users.username,
          upVotes: comments.upvotes,
          downVotes: comments.downvotes
        })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.articleId, sql.placeholder('articleId')))
        .orderBy(sql`${sql.placeholder('sortField')} ${sql.placeholder('sortOrder')}`)
        .limit(sql.placeholder('limit'))
        .offset(sql.placeholder('offset'))
        .prepare()
    }
    return this.getArticleCommentsStmt
  }

  /**
   * 懒加载初始化 getArticleCommentsCount prepared statement
   */
  private initGetArticleCommentsCountStmt() {
    if (!this.getArticleCommentsCountStmt) {
      this.getArticleCommentsCountStmt = this.drizzle
        .select({ count: sql<number>`count(*)` })
        .from(comments)
        .where(eq(comments.articleId, sql.placeholder('articleId')))
        .prepare()
    }
    return this.getArticleCommentsCountStmt
  }

  /**
   * 懒加载初始化 getCommentById prepared statement
   */
  private initGetCommentByIdStmt() {
    if (!this.getCommentByIdStmt) {
      this.getCommentByIdStmt = this.drizzle
        .select({
          id: comments.id,
          content: comments.content,
          articleId: comments.articleId,
          authorId: comments.userId,
          parentId: comments.parentId,
          status: comments.status,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          authorName: users.username,
          upVotes: comments.upvotes,
          downVotes: comments.downvotes
        })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(eq(comments.id, sql.placeholder('id')))
        .limit(1)
        .prepare()
    }
    return this.getCommentByIdStmt
  }

  /**
   * 懒加载初始化 getCommentVote prepared statement
   */
  private initGetCommentVoteStmt() {
    if (!this.getCommentVoteStmt) {
      this.getCommentVoteStmt = this.drizzle
        .select()
        .from(commentVotes)
        .where(and(
          eq(commentVotes.commentId, sql.placeholder('commentId')),
          eq(commentVotes.userId, sql.placeholder('userId'))
        ))
        .limit(1)
        .prepare()
    }
    return this.getCommentVoteStmt
  }

  /**
   * 懒加载初始化 getCommentReport prepared statement
   */
  private initGetCommentReportStmt() {
    if (!this.getCommentReportStmt) {
      this.getCommentReportStmt = this.drizzle
        .select()
        .from(commentReports)
        .where(and(
          eq(commentReports.commentId, sql.placeholder('commentId')),
          eq(commentReports.userId, sql.placeholder('userId'))
        ))
        .limit(1)
        .prepare()
    }
    return this.getCommentReportStmt
  }

  /**
   * 懒加载初始化 getCommentReportsCount prepared statement
   */
  private initGetCommentReportsCountStmt() {
    if (!this.getCommentReportsCountStmt) {
      this.getCommentReportsCountStmt = this.drizzle
        .select({ count: sql<number>`count(*)` })
        .from(commentReports)
        .where(eq(commentReports.commentId, sql.placeholder('commentId')))
        .prepare()
    }
    return this.getCommentReportsCountStmt
  }

  /**
   * 获取文章评论列表
   * @param articleId 文章ID
   * @param page 页码
   * @param pageSize 每页数量
   * @param sortBy 排序字段
   * @param sortOrder 排序方向
   */
  async getArticleComments(
    articleId: number,
    page: number = 1,
    pageSize: number = 10,
    sortBy: string = 'created_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ comments: Comment[]; total: number }> {
    const offset = (page - 1) * pageSize

    // 获取评论列表
    const stmt = this.initGetArticleCommentsStmt()
    const result = await stmt.execute({
      articleId,
      sortField: comments[sortBy],
      sortOrder,
      limit: pageSize,
      offset
    })

    // 获取评论总数
    const countStmt = this.initGetArticleCommentsCountStmt()
    const total = await countStmt.execute({ articleId })

    return {
      comments: result.map((row: any) => ({
        id: Number(row.id),
        content: String(row.content),
        articleId: Number(row.articleId),
        authorId: Number(row.authorId),
        parentId: row.parentId ? Number(row.parentId) : null,
        status: String(row.status) as CommentStatus,
        createdAt: new Date(Number(row.createdAt)),
        updatedAt: new Date(Number(row.updatedAt)),
        authorName: row.authorName,
        upVotes: Number(row.upVotes),
        downVotes: Number(row.downVotes),
        isActive: true
      })),
      total: total[0]?.count ?? 0
    }
  }

  /**
   * 创建评论
   * @param input 评论输入
   * @param userId 用户ID
   */
  async createComment(input: CommentCreateInput, userId: number): Promise<Comment> {
    const result = await this.drizzle
      .insert(comments)
      .values({
        content: input.content,
        articleId: input.article_id,
        userId,
        parentId: input.parent_id,
        status: 'PENDING',
        upvotes: 0,
        downvotes: 0,
        reportCount: 0
      })
      .returning()

    const comment = result[0]
    if (!comment) {
      throw new Error('创建评论失败')
    }

    return {
      id: Number(comment.id),
      content: String(comment.content),
      articleId: Number(comment.articleId),
      authorId: Number(comment.userId),
      parentId: comment.parentId ? Number(comment.parentId) : null,
      status: String(comment.status) as CommentStatus,
      createdAt: new Date(Number(comment.createdAt)),
      updatedAt: new Date(Number(comment.updatedAt)),
      authorName: null,
      upVotes: 0,
      downVotes: 0,
      isActive: true
    }
  }

  /**
   * 更新评论
   * @param id 评论ID
   * @param input 评论输入
   */
  async updateComment(id: number, input: CommentUpdateInput): Promise<Comment> {
    const result = await this.drizzle
      .update(comments)
      .set({
        content: input.content,
        updatedAt: new Date()
      })
      .where(eq(comments.id, id))
      .returning()

    const comment = result[0]
    if (!comment) {
      throw new Error('评论不存在')
    }

    return {
      id: Number(comment.id),
      content: String(comment.content),
      articleId: Number(comment.articleId),
      authorId: Number(comment.userId),
      parentId: comment.parentId ? Number(comment.parentId) : null,
      status: String(comment.status) as CommentStatus,
      createdAt: new Date(Number(comment.createdAt)),
      updatedAt: new Date(Number(comment.updatedAt)),
      authorName: null,
      upVotes: Number(comment.upvotes),
      downVotes: Number(comment.downvotes),
      isActive: true
    }
  }

  /**
   * 删除评论
   * @param id 评论ID
   */
  async deleteComment(id: number): Promise<void> {
    const result = await this.drizzle
      .delete(comments)
      .where(eq(comments.id, id))
      .returning()

    if (!result[0]) {
      throw new Error('评论不存在')
    }
  }

  /**
   * 更新评论状态
   * @param id 评论ID
   * @param status 评论状态
   */
  async updateCommentStatus(id: number, status: CommentStatus): Promise<Comment> {
    const result = await this.drizzle
      .update(comments)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(comments.id, id))
      .returning()

    const comment = result[0]
    if (!comment) {
      throw new Error('评论不存在')
    }

    return {
      id: Number(comment.id),
      content: String(comment.content),
      articleId: Number(comment.articleId),
      authorId: Number(comment.userId),
      parentId: comment.parentId ? Number(comment.parentId) : null,
      status: String(comment.status) as CommentStatus,
      createdAt: new Date(Number(comment.createdAt)),
      updatedAt: new Date(Number(comment.updatedAt)),
      authorName: null,
      upVotes: Number(comment.upvotes),
      downVotes: Number(comment.downvotes),
      isActive: true
    }
  }

  /**
   * 获取评论详情
   * @param id 评论ID
   */
  private async getCommentById(id: number): Promise<Comment | null> {
    const stmt = this.initGetCommentByIdStmt()
    const [result] = await stmt.execute({ id })

    if (!result) {
      return null
    }

    return {
      id: Number(result.id),
      content: String(result.content),
      articleId: Number(result.articleId),
      authorId: Number(result.authorId),
      parentId: result.parentId ? Number(result.parentId) : null,
      status: String(result.status) as CommentStatus,
      createdAt: new Date(Number(result.createdAt)),
      updatedAt: new Date(Number(result.updatedAt)),
      authorName: result.authorName,
      upVotes: Number(result.upVotes),
      downVotes: Number(result.downVotes),
      isActive: true
    }
  }

  /**
   * 投票评论
   * @param id 评论ID
   * @param userId 用户ID
   * @param voteType 投票类型
   */
  voteComment = withTransaction(
    this.drizzle,
    async (id: number, userId: number, voteType: VoteType): Promise<void> => {
      // 检查评论是否存在
      const comment = await this.getCommentById(id)
      if (!comment) {
        throw new Error('评论不存在')
      }

      // 检查用户是否已经投票
      const voteStmt = this.initGetCommentVoteStmt()
      const [existingVote] = await voteStmt.execute({ commentId: id, userId })

      if (existingVote) {
        await this.handleExistingVote(id, userId, voteType, existingVote.voteType)
      } else {
        await this.createNewVote(id, userId, voteType)
      }
    },
    TransactionPropagation.REQUIRED
  );

  /**
   * 处理已存在的投票
   * @param commentId 评论ID
   * @param userId 用户ID
   * @param newVoteType 新的投票类型
   * @param existingVoteType 已存在的投票类型
   */
  private async handleExistingVote(
    commentId: number,
    userId: number,
    newVoteType: VoteType,
    existingVoteType: VoteType
  ): Promise<void> {
    if (existingVoteType === newVoteType) {
      // 如果投票类型相同，取消投票
      await this.cancelVote(commentId, userId, newVoteType)
    } else {
      // 如果投票类型不同，更新投票
      await this.changeVote(commentId, userId, newVoteType, existingVoteType)
    }
  }

  /**
   * 取消投票
   * @param commentId 评论ID
   * @param userId 用户ID
   * @param voteType 投票类型
   */
  private async cancelVote(
    commentId: number,
    userId: number,
    voteType: VoteType
  ): Promise<void> {
    // 删除投票记录
    await this.drizzle
      .delete(commentVotes)
      .where(and(
        eq(commentVotes.commentId, commentId),
        eq(commentVotes.userId, userId)
      ))

    // 更新评论的投票数
    await this.drizzle
      .update(comments)
      .set({
        upvotes: voteType === 'UP' ? sql`upvotes - 1` : sql`upvotes`,
        downvotes: voteType === 'DOWN' ? sql`downvotes - 1` : sql`downvotes`
      })
      .where(eq(comments.id, commentId))
  }

  /**
   * 更改投票类型
   * @param commentId 评论ID
   * @param userId 用户ID
   * @param newVoteType 新的投票类型
   * @param oldVoteType 旧的投票类型
   */
  private async changeVote(
    commentId: number,
    userId: number,
    newVoteType: VoteType,
    oldVoteType: VoteType
  ): Promise<void> {
    // 更新投票记录
    await this.drizzle
      .update(commentVotes)
      .set({ voteType: newVoteType })
      .where(and(
        eq(commentVotes.commentId, commentId),
        eq(commentVotes.userId, userId)
      ))

    // 更新评论的投票数
    await this.drizzle
      .update(comments)
      .set({
        upvotes: newVoteType === 'UP' ? sql`upvotes + 1` : sql`upvotes - 1`,
        downvotes: newVoteType === 'DOWN' ? sql`downvotes + 1` : sql`downvotes - 1`
      })
      .where(eq(comments.id, commentId))
  }

  /**
   * 创建新投票
   * @param commentId 评论ID
   * @param userId 用户ID
   * @param voteType 投票类型
   */
  private async createNewVote(
    commentId: number,
    userId: number,
    voteType: VoteType
  ): Promise<void> {
    // 创建新投票记录
    await this.drizzle
      .insert(commentVotes)
      .values({
        commentId,
        userId,
        voteType
      })

    // 更新评论的投票数
    await this.drizzle
      .update(comments)
      .set({
        upvotes: voteType === 'UP' ? sql`upvotes + 1` : sql`upvotes`,
        downvotes: voteType === 'DOWN' ? sql`downvotes + 1` : sql`downvotes`
      })
      .where(eq(comments.id, commentId))
  }

  /**
   * 举报评论
   * @param id 评论ID
   * @param userId 用户ID
   * @param reason 举报原因
   * @param description 举报描述
   */
  reportComment = withTransaction(
    this.drizzle,
    async (
      id: number,
      userId: number,
      reason: ReportReason,
      description?: string
    ): Promise<void> => {
      // 检查评论是否存在
      const comment = await this.getCommentById(id)
      if (!comment) {
        throw new Error('评论不存在')
      }

      // 检查用户是否已经举报
      const reportStmt = this.initGetCommentReportStmt()
      const [existingReport] = await reportStmt.execute({ commentId: id, userId })

      if (existingReport) {
        // 如果已经举报，更新举报
        await this.drizzle
          .update(commentReports)
          .set({
            reason,
            description,
            createdAt: new Date()
          })
          .where(and(
            eq(commentReports.commentId, id),
            eq(commentReports.userId, userId)
          ))
      } else {
        // 如果还没有举报，创建新举报
        await this.drizzle
          .insert(commentReports)
          .values({
            commentId: id,
            userId,
            reason,
            description
          })

        // 更新评论的举报数
        await this.drizzle
          .update(comments)
          .set({
            reportCount: sql`report_count + 1`
          })
          .where(eq(comments.id, id))
      }
    },
    TransactionPropagation.REQUIRED
  );

  /**
   * 获取评论统计信息
   */
  async getStatistics(): Promise<{
    total: number
    pending: number
    approved: number
    rejected: number
    reported: number
  }> {
    const stmt = this.initGetStatisticsStmt()
    const [result] = await stmt.execute({})

    return {
      total: result?.total ?? 0,
      pending: result?.pending ?? 0,
      approved: result?.approved ?? 0,
      rejected: result?.rejected ?? 0,
      reported: result?.reported ?? 0
    }
  }
}

// 添加 PreparedStatement 类型定义
interface PreparedStatement {
  execute(params: Record<string, any>): Promise<any[]>
} 