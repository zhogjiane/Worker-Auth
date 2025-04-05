import { Hono } from 'hono'
import { Env } from './types/env'
import { createAuthRoutes } from './routes/auth.routes'
import { createArticleRoutes } from './routes/article.routes'
import { createCommentRoutes } from './routes/comment.routes'
import { errorHandler } from './middleware/error.middleware'
import { corsMiddleware, securityHeadersMiddleware } from './middleware/security.middleware'
import { databaseInitMiddleware } from './middleware/database.middleware'
import { createDb } from './db'

// 创建 Hono 应用实例
const app = new Hono<{ Bindings: Env }>()

// 注册全局中间件
app.use('*', errorHandler)
app.use('*', (c, next) => corsMiddleware(c.env)(c, next))
app.use('*', securityHeadersMiddleware)
app.use('*', databaseInitMiddleware)

// API 路由
app.use('/api/auth/*', async (c) => {
  const router = createAuthRoutes(c.env)
  return router.fetch(c.req.raw, c.env)
})

app.use('/api/articles/*', async (c) => {
  const drizzle = createDb(c.env.DB)
  const router = createArticleRoutes(c.env, drizzle)
  return router.fetch(c.req.raw, c.env)
})

app.use('/api/comments/*', async (c) => {
  const router = createCommentRoutes(c.env)
  return router.fetch(c.req.raw, c.env)
})

// 健康检查
app.get('/health', (c) => c.json({ status: 'ok' }))

// 404 处理
app.notFound((c) => c.json({ error: 'Not Found' }, 404))

// 错误处理
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

export default app 