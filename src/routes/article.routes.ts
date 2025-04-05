import { Env } from '../types/env'
import { ArticleController } from '../controllers/article.controller'
import { ArticleService } from '../services/article.service'
import { authMiddleware } from '../utils/auth'
import { createRouteGroup } from './factory'


/**
 * 创建文章路由
 * 使用路由组功能组织相关路由
 */
export const createArticleRoutes = createRouteGroup<{ Bindings: Env }>(
  '/articles',
  (app, env, drizzle) => {
    // 初始化服务和控制器
    if (!drizzle) {
      throw new Error('Database connection is required for article routes')
    }
    
    const articleService = new ArticleService(env, drizzle)
    const articleController = new ArticleController(articleService)

    // 公开路由 - 不需要认证的接口
    app.get('/', articleController.getArticles)
    app.get('/:id', articleController.getArticle)
    app.post('/:id/view', articleController.incrementViewCount)

    // 需要认证的路由 - 需要用户登录的接口
    app.use('*', authMiddleware)
    app.post('/', articleController.createArticle)
    app.put('/:id', articleController.updateArticle)
    app.delete('/:id', articleController.deleteArticle)
    app.put('/:id/status', articleController.updateArticleStatus)
    app.get('/statistics', articleController.getStatistics)

    return app
  }
) 