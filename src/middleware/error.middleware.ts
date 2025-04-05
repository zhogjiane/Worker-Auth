import { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError, 
  NotFoundError, 
  BusinessError 
} from '../errors/error.types'
import { ResponseUtil } from '../utils/response.util'

// 错误处理映射表
const errorHandlers = [
  {
    type: z.ZodError,
    handler: (error: z.ZodError) => ({
      message: '验证失败',
      code: 'VALIDATION_ERROR',
      status: 400,
      errors: error.errors
    })
  },
  {
    type: HTTPException,
    handler: (error: HTTPException) => ({
      message: error.message || '请求处理失败',
      code: 'HTTP_ERROR',
      status: error.status
    })
  },
  {
    type: AppError,
    handler: (error: AppError) => ({
      message: error.message,
      code: error.code,
      status: error.statusCode
    })
  },
  {
    type: ValidationError,
    handler: (error: ValidationError) => ({
      message: error.message,
      code: 'VALIDATION_ERROR',
      status: 400,
      errors: error.errors
    })
  },
  {
    type: AuthenticationError,
    handler: (error: AuthenticationError) => ({
      message: error.message,
      code: error.code,
      status: 401
    })
  },
  {
    type: AuthorizationError,
    handler: (error: AuthorizationError) => ({
      message: error.message,
      code: error.code,
      status: 403
    })
  },
  {
    type: NotFoundError,
    handler: (error: NotFoundError) => ({
      message: error.message,
      code: error.code,
      status: 404
    })
  },
  {
    type: BusinessError,
    handler: (error: BusinessError) => ({
      message: error.message,
      code: error.code,
      status: 400
    })
  }
]

/**
 * 统一错误处理中间件
 * 处理所有类型的错误并返回标准格式的响应
 */
export const errorHandler: MiddlewareHandler = async (c, next) => {
  try {
    await next()
  } catch (error) {
    console.error('Error caught by middleware:', error)
    
    // 查找匹配的错误处理器
    const handler = errorHandlers.find(h => error instanceof h.type)
    
    if (handler) {
      const result = handler.handler(error as any)
      return ResponseUtil.error(
        c,
        result.message,
        result.code,
        result.status as ContentfulStatusCode,
        'errors' in result ? result.errors : undefined
      )
    }
    
    // 处理未知错误
    return ResponseUtil.error(
      c,
      '服务器内部错误',
      'INTERNAL_SERVER_ERROR',
      500
    )
  }
} 