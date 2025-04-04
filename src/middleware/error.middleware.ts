import { MiddlewareHandler } from 'hono'
import { ErrorHandlerChain } from '../errors/error.handler'

/**
 * 错误处理中间件
 */
export const errorHandler: MiddlewareHandler = async (c, next) => {
  try {
    await next()
  } catch (error) {
    const errorHandlerChain = new ErrorHandlerChain()
    return await errorHandlerChain.handle(error, c)
  }
} 