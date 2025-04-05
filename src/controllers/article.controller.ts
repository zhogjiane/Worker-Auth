import { Context } from 'hono'
import { ArticleService } from '../services/article.service'
import { ArticleCreateInput, ArticleUpdateInput, ArticleStatus } from '../types/article'
import { getUserIdFromToken } from '../utils/auth'

export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  /**
   * 获取文章列表
   */
  async getArticles(ctx: Context) {
    const page = Number(ctx.req.query('page')) || 1
    const pageSize = Number(ctx.req.query('pageSize')) || 10
    const status = ctx.req.query('status') as ArticleStatus

    const result = await this.articleService.getArticles(page, pageSize, status)
    return ctx.json(result)
  }

  /**
   * 获取文章详情
   */
  async getArticle(ctx: Context) {
    const id = Number(ctx.req.param('id'))
    const article = await this.articleService.getArticle(id)
    if (!article) {
      ctx.status(404)
      return ctx.json({ message: '文章不存在' })
    }
    return ctx.json(article)
  }

  /**
   * 创建文章
   */
  async createArticle(ctx: Context) {
    const userId = await getUserIdFromToken(ctx)
    if (!userId) {
      return ctx.json({ error: '未授权访问' }, 401)
    }
    const input = await ctx.req.json<ArticleCreateInput>()
    const article = await this.articleService.createArticle(userId, input)
    return ctx.json(article)
  }

  /**
   * 更新文章
   */
  async updateArticle(ctx: Context) {
    const userId = await getUserIdFromToken(ctx)
    if (!userId) {
      return ctx.json({ error: '未授权访问' }, 401)
    }
    const idParam = ctx.req.param('id')
    const id = Number(idParam)
    if (isNaN(id)) {
      return ctx.json({ error: '无效的文章ID' }, 400)
    }
    const input = await ctx.req.json<ArticleUpdateInput>()
    const article = await this.articleService.updateArticle(id, userId, input)
    return ctx.json(article)
  }

  /**
   * 删除文章
   */
  async deleteArticle(ctx: Context) {
    const userId = await getUserIdFromToken(ctx)
    if (!userId) {
      return ctx.json({ error: '未授权访问' }, 401)
    }
    const idParam = ctx.req.param('id')
    const id = Number(idParam)
    if (isNaN(id)) {
      return ctx.json({ error: '无效的文章ID' }, 400)
    }
    await this.articleService.deleteArticle(id, userId)
    return ctx.json({ message: '删除成功' })
  }

  /**
   * 更新文章状态
   */
  async updateArticleStatus(ctx: Context) {
    const id = Number(ctx.req.param('id'))
    const { status } = await ctx.req.json<{ status: ArticleStatus }>()
    await this.articleService.updateArticleStatus(id, status)
    return ctx.json({ message: '更新成功' })
  }

  /**
   * 增加文章浏览量
   */
  async incrementViewCount(ctx: Context) {
    const id = Number(ctx.req.param('id'))
    await this.articleService.incrementViewCount(id)
    return ctx.json({ message: '更新成功' })
  }

  /**
   * 获取文章统计信息
   */
  async getStatistics(ctx: Context) {
    const stats = await this.articleService.getStatistics()
    return ctx.json(stats)
  }
} 