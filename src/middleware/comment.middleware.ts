import { Context } from 'hono'
import { UserRoleEnum } from '../types/auth'

/**
 * 检查用户是否有权限管理评论
 */
export async function commentManagementMiddleware(ctx: Context, next: () => Promise<void>): Promise<Response | void> {
  const userId = ctx.get('userId')
  if (!userId) {
    ctx.status(401)
    return ctx.json({ message: '未授权访问' })
  }

  // 获取用户角色
  const { results } = await ctx.env.DB.prepare(`
    SELECT role FROM users WHERE id = ?
  `).bind(userId).all()

  if (results.length === 0) {
    ctx.status(404)
    return ctx.json({ message: '用户不存在' })
  }

  const userRole = results[0].role as UserRoleEnum

  // 只有管理员和编辑可以管理评论
  if (userRole !== 'ADMIN' && userRole !== 'EDITOR') {
    ctx.status(403)
    return ctx.json({ message: '没有权限管理评论' })
  }

  return next()
}

/**
 * 检查用户是否有权限修改评论
 */
export async function commentModificationMiddleware(ctx: Context, next: () => Promise<void>): Promise<Response | void> {
  const userId = ctx.get('userId')
  const commentId = Number(ctx.req.param('id'))

  if (!userId) {
    ctx.status(401)
    return ctx.json({ message: '未授权访问' })
  }

  // 获取评论信息
  const { results } = await ctx.env.DB.prepare(`
    SELECT user_id, status FROM comments WHERE id = ?
  `).bind(commentId).all()

  if (results.length === 0) {
    ctx.status(404)
    return ctx.json({ message: '评论不存在' })
  }

  const comment = results[0]
  const userRole = (await ctx.env.DB.prepare(`
    SELECT role FROM users WHERE id = ?
  `).bind(userId).first())?.role as UserRoleEnum

  // 允许管理员、编辑或评论作者修改评论
  if (userRole !== 'ADMIN' && userRole !== 'EDITOR' && comment.user_id !== userId) {
    ctx.status(403)
    return ctx.json({ message: '没有权限修改该评论' })
  }

  // 如果评论已审核通过，只有管理员和编辑可以修改
  if (comment.status === 'APPROVED' && userRole !== 'ADMIN' && userRole !== 'EDITOR') {
    ctx.status(403)
    return ctx.json({ message: '已审核通过的评论只能由管理员或编辑修改' })
  }

  return next()
}

/**
 * 检查用户是否有权限删除评论
 */
export async function commentDeletionMiddleware(ctx: Context, next: () => Promise<void>): Promise<Response | void> {
  const userId = ctx.get('userId')
  const commentId = Number(ctx.req.param('id'))

  if (!userId) {
    ctx.status(401)
    return ctx.json({ message: '未授权访问' })
  }

  // 获取评论信息
  const { results } = await ctx.env.DB.prepare(`
    SELECT user_id FROM comments WHERE id = ?
  `).bind(commentId).all()

  if (results.length === 0) {
    ctx.status(404)
    return ctx.json({ message: '评论不存在' })
  }

  const comment = results[0]
  const userRole = (await ctx.env.DB.prepare(`
    SELECT role FROM users WHERE id = ?
  `).bind(userId).first())?.role as UserRoleEnum

  // 允许管理员、编辑或评论作者删除评论
  if (userRole !== 'ADMIN' && userRole !== 'EDITOR' && comment.user_id !== userId) {
    ctx.status(403)
    return ctx.json({ message: '没有权限删除该评论' })
  }

  return next()
}

/**
 * 检查用户是否有权限审核评论
 */
export async function commentReviewMiddleware(ctx: Context, next: () => Promise<void>): Promise<Response | void> {
  const userId = ctx.get('userId')
  if (!userId) {
    ctx.status(401)
    return ctx.json({ message: '未授权访问' })
  }

  // 获取用户角色
  const { results } = await ctx.env.DB.prepare(`
    SELECT role FROM users WHERE id = ?
  `).bind(userId).all()

  if (results.length === 0) {
    ctx.status(404)
    return ctx.json({ message: '用户不存在' })
  }

  const userRole = results[0].role as UserRoleEnum

  // 只有管理员和编辑可以审核评论
  if (userRole !== 'ADMIN' && userRole !== 'EDITOR') {
    ctx.status(403)
    return ctx.json({ message: '没有权限审核评论' })
  }

  return next()
} 