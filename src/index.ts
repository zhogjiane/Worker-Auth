import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Env } from './types/env'
import { errorHandler } from './middleware/error.middleware'
import { corsMiddleware } from './middleware/security.middleware'
import { databaseInitMiddleware } from './middleware/database.middleware'
import auth from './routes/auth'
import captcha from './routes/captcha'

// 创建应用实例
const app = new Hono<{ Bindings: Env }>()

// 添加错误处理中间件
app.use('*', errorHandler)

// 配置 CORS
app.use('*', (c, next) => corsMiddleware(c.env)(c, next))

// 添加数据库初始化中间件
app.use('*', databaseInitMiddleware)

// 健康检查
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    message: 'API is running'
  })
})

// 注册路由
app.route('/api/auth', auth)
app.route('/api/captcha', captcha)

// 404 处理
app.notFound((c) => {
  return c.json({
    success: false,
    message: '请求的资源不存在',
    code: 'NOT_FOUND'
  }, 404)
})

// 导出应用
export default app 