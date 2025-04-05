import { Env } from '../types/env'
import { CommentController } from '../controllers/comment.controller'
import { CommentService } from '../services/comment.service'
import { authMiddleware } from '../utils/auth'
import { 
  commentManagementMiddleware, 
  commentModificationMiddleware, 
  commentDeletionMiddleware, 
  commentReviewMiddleware 
} from '../middleware/comment.middleware'
import { createDb } from '../db'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import type { DbSchema } from '../db'
import { createRouteGroup } from './factory'

/**
 * 创建评论路由
 * 使用路由组功能组织相关路由
 */
export const createCommentRoutes = createRouteGroup<{ Bindings: Env }>('/comments', (app, env) => {
  // 初始化数据库连接
  const drizzleDb: DrizzleD1Database<DbSchema> = createDb(env.DB)
  
  // 初始化服务
  const commentService = new CommentService(env, drizzleDb)
  const commentController = new CommentController(commentService)

  // 获取文章评论列表
  app.get('/articles/:articleId/comments', commentController.getArticleComments)

  // 创建评论
  app.post('/', authMiddleware, commentController.createComment)

  // 更新评论
  app.put('/:id', authMiddleware, commentModificationMiddleware, commentController.updateComment)

  // 删除评论
  app.delete('/:id', authMiddleware, commentDeletionMiddleware, commentController.deleteComment)

  // 更新评论状态（审核）
  app.put('/:id/status', authMiddleware, commentReviewMiddleware, commentController.updateCommentStatus)

  // 评论投票
  app.post('/:id/vote', authMiddleware, commentController.voteComment)

  // 举报评论
  app.post('/:id/report', authMiddleware, commentController.reportComment)

  // 获取评论统计信息
  app.get('/statistics', authMiddleware, commentManagementMiddleware, commentController.getStatistics)

  return app
}) 