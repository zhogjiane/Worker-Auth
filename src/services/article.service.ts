import { Env } from '../types/env'
import { Article, ArticleCreateInput, ArticleUpdateInput, ArticleStatus } from '../types/article'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { DbSchema } from '../db'
import { articles, users } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'

export class ArticleService {
  // 使用 any 类型暂时解决类型问题，后续可以改进为更精确的类型
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getArticleStmt: any | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getArticlesStmt: any | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getArticlesCountStmt: any | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getArticlesByStatusStmt: any | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getArticlesCountByStatusStmt: any | null = null

  constructor(
    private readonly env: Env,
    private readonly drizzle: DrizzleD1Database<DbSchema>
  ) {}

  /**
   * 懒加载初始化 getArticle prepared statement
   */
  private initGetArticleStmt() {
    if (!this.getArticleStmt) {
      this.getArticleStmt = this.drizzle
        .select({
          id: articles.id,
          title: articles.title,
          content: articles.content,
          status: articles.status,
          createdAt: articles.createdAt,
          updatedAt: articles.updatedAt,
          authorId: articles.authorId,
          authorName: users.username,
          commentCount: sql<number>`(SELECT COUNT(*) FROM comments c WHERE c.article_id = articles.id AND c.status = 'APPROVED')`,
          isActive: sql<boolean>`1`,
          publishedAt: articles.publishedAt,
          isPremium: articles.isPremium
        })
        .from(articles)
        .leftJoin(users, eq(articles.authorId, users.id))
        .where(eq(articles.id, sql.placeholder('id')))
        .prepare()
    }
    return this.getArticleStmt
  }

  /**
   * 懒加载初始化 getArticles prepared statement
   */
  private initGetArticlesStmt() {
    if (!this.getArticlesStmt) {
      this.getArticlesStmt = this.drizzle
        .select({
          id: articles.id,
          title: articles.title,
          content: articles.content,
          status: articles.status,
          createdAt: articles.createdAt,
          updatedAt: articles.updatedAt,
          authorId: articles.authorId,
          authorName: users.username,
          commentCount: sql<number>`(SELECT COUNT(*) FROM comments c WHERE c.article_id = articles.id AND c.status = 'APPROVED')`,
          isActive: sql<boolean>`1`,
          publishedAt: articles.publishedAt,
          isPremium: articles.isPremium
        })
        .from(articles)
        .leftJoin(users, eq(articles.authorId, users.id))
        .where(sql`1=1`)
        .orderBy(articles.createdAt)
        .limit(sql.placeholder('limit'))
        .offset(sql.placeholder('offset'))
        .prepare()
    }
    return this.getArticlesStmt
  }

  /**
   * 懒加载初始化 getArticlesCount prepared statement
   */
  private initGetArticlesCountStmt() {
    if (!this.getArticlesCountStmt) {
      this.getArticlesCountStmt = this.drizzle
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(sql`1=1`)
        .prepare()
    }
    return this.getArticlesCountStmt
  }

  /**
   * 懒加载初始化 getArticlesByStatus prepared statement
   */
  private initGetArticlesByStatusStmt() {
    if (!this.getArticlesByStatusStmt) {
      this.getArticlesByStatusStmt = this.drizzle
        .select({
          id: articles.id,
          title: articles.title,
          content: articles.content,
          status: articles.status,
          createdAt: articles.createdAt,
          updatedAt: articles.updatedAt,
          authorId: articles.authorId,
          authorName: users.username,
          commentCount: sql<number>`(SELECT COUNT(*) FROM comments c WHERE c.article_id = articles.id AND c.status = 'APPROVED')`,
          isActive: sql<boolean>`1`,
          publishedAt: articles.publishedAt,
          isPremium: articles.isPremium
        })
        .from(articles)
        .leftJoin(users, eq(articles.authorId, users.id))
        .where(eq(articles.status, sql.placeholder('status')))
        .orderBy(articles.createdAt)
        .limit(sql.placeholder('limit'))
        .offset(sql.placeholder('offset'))
        .prepare()
    }
    return this.getArticlesByStatusStmt
  }

  /**
   * 懒加载初始化 getArticlesCountByStatus prepared statement
   */
  private initGetArticlesCountByStatusStmt() {
    if (!this.getArticlesCountByStatusStmt) {
      this.getArticlesCountByStatusStmt = this.drizzle
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(eq(articles.status, sql.placeholder('status')))
        .prepare()
    }
    return this.getArticlesCountByStatusStmt
  }

  /**
   * 获取文章列表
   * @param page 页码
   * @param pageSize 每页数量
   * @param status 文章状态
   * @returns 文章列表和总数
   */
  async getArticles(page: number = 1, pageSize: number = 10, status?: ArticleStatus) {
    const offset = (page - 1) * pageSize
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let articleList: any[]
    let total: number
    
    if (status) {
      // 使用按状态过滤的 prepared statement
      const stmt = this.initGetArticlesByStatusStmt()
      articleList = await stmt.execute({
        status,
        limit: pageSize,
        offset
      })
      
      const countStmt = this.initGetArticlesCountByStatusStmt()
      const totalResult = await countStmt.execute({ status }) as { count: number }[]
      total = Number(totalResult[0].count)
    } else {
      // 使用不带过滤的 prepared statement
      const stmt = this.initGetArticlesStmt()
      articleList = await stmt.execute({
        limit: pageSize,
        offset
      })
      
      const countStmt = this.initGetArticlesCountStmt()
      const totalResult = await countStmt.execute({}) as { count: number }[]
      total = Number(totalResult[0].count)
    }

    return {
      articles: articleList.map(article => ({
        ...article,
        createdAt: new Date(Number(article.createdAt)),
        updatedAt: new Date(Number(article.updatedAt)),
        publishedAt: article.publishedAt ? new Date(Number(article.publishedAt)) : null,
        viewCount: 0, // 默认值，因为数据库中没有这个字段
        isActive: Boolean(article.isActive)
      })) as Article[],
      total
    }
  }

  /**
   * 获取文章详情
   * @param id 文章ID
   * @returns 文章详情
   */
  async getArticle(id: number): Promise<Article | null> {
    const stmt = this.initGetArticleStmt()
    const result = await stmt.execute({ id })

    if (!result[0]) return null

    return {
      ...result[0],
      createdAt: new Date(Number(result[0].createdAt)),
      updatedAt: new Date(Number(result[0].updatedAt)),
      publishedAt: result[0].publishedAt ? new Date(Number(result[0].publishedAt)) : null,
      viewCount: 0, // 默认值，因为数据库中没有这个字段
      isActive: Boolean(result[0].isActive)
    } as Article
  }

  /**
   * 创建文章
   * @param userId 用户ID
   * @param input 文章信息
   * @returns 创建的文章
   */
  async createArticle(userId: number, input: ArticleCreateInput): Promise<Article> {
    const [article] = await this.drizzle
      .insert(articles)
      .values({
        title: input.title,
        content: input.content,
        authorId: userId,
        status: 'DRAFT',
        isPremium: input.isPremium || false
      })
      .returning()

    return this.getArticle(article.id) as Promise<Article>
  }

  /**
   * 更新文章
   * @param id 文章ID
   * @param userId 用户ID
   * @param input 更新信息
   * @returns 更新后的文章
   */
  async updateArticle(id: number, userId: number, input: ArticleUpdateInput): Promise<Article> {
    const updateData: Partial<typeof articles.$inferInsert> = {
      updatedAt: new Date()
    }

    if (input.title) updateData.title = input.title
    if (input.content) updateData.content = input.content
    if (input.status) updateData.status = input.status
    if (input.isPremium !== undefined) updateData.isPremium = input.isPremium

    if (Object.keys(updateData).length === 1) {
      throw new Error('没有要更新的字段')
    }

    await this.drizzle
      .update(articles)
      .set(updateData)
      .where(and(eq(articles.id, id), eq(articles.authorId, userId)))

    return this.getArticle(id) as Promise<Article>
  }

  /**
   * 删除文章
   * @param id 文章ID
   * @param userId 用户ID
   */
  async deleteArticle(id: number, userId: number): Promise<void> {
    await this.drizzle
      .delete(articles)
      .where(and(eq(articles.id, id), eq(articles.authorId, userId)))
  }

  /**
   * 更新文章状态
   * @param id 文章ID
   * @param status 新状态
   */
  async updateArticleStatus(id: number, status: ArticleStatus): Promise<void> {
    await this.drizzle
      .update(articles)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(articles.id, id))
  }

  /**
   * 增加文章浏览量
   * @param id 文章ID
   */
  async incrementViewCount(id: number): Promise<void> {
    // 由于数据库中没有 viewCount 字段，这个方法暂时不执行任何操作
    // 如果需要实现浏览量统计，需要先添加 viewCount 字段到数据库
    console.log(`Article ${id} view count incremented (not implemented in database)`)
  }

  /**
   * 获取文章统计信息
   * @returns 文章统计信息
   */
  async getStatistics() {
    const total = await this.drizzle
      .select({ count: sql<number>`count(*)` })
      .from(articles)
      .then(result => Number(result[0].count))

    const byStatus = await this.drizzle
      .select({
        status: articles.status,
        count: sql<number>`count(*)`
      })
      .from(articles)
      .groupBy(articles.status)

    const byAuthor = await this.drizzle
      .select({
        authorId: articles.authorId,
        count: sql<number>`count(*)`
      })
      .from(articles)
      .groupBy(articles.authorId)

    return {
      total,
      byStatus,
      byAuthor
    }
  }
} 