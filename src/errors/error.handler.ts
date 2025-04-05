import { Context } from 'hono'
import { z } from 'zod'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { 
  AppError
} from './error.types'

/**
 * 错误处理器接口
 */
export interface ErrorHandler {
  canHandle(error: unknown): boolean
  handle(error: unknown, c: Context): Promise<Response>
}

/**
 * Zod 验证错误处理器
 */
export class ZodErrorHandler implements ErrorHandler {
  canHandle(error: unknown): boolean {
    return error instanceof z.ZodError
  }

  async handle(error: unknown, c: Context): Promise<Response> {
    const zodError = error as z.ZodError
    return c.json({
      success: false,
      message: '验证失败',
      errors: zodError.errors
    }, 400 as ContentfulStatusCode)
  }
}

/**
 * 应用错误处理器
 */
export class AppErrorHandler implements ErrorHandler {
  canHandle(error: unknown): boolean {
    return error instanceof AppError
  }

  async handle(error: unknown, c: Context): Promise<Response> {
    const appError = error as AppError
    return c.json({
      success: false,
      message: appError.message,
      code: appError.code
    }, appError.statusCode as ContentfulStatusCode)
  }
}

/**
 * 通用错误处理器
 */
export class GenericErrorHandler implements ErrorHandler {
  canHandle(error: unknown): boolean {
    return true
  }

  async handle(error: unknown, c: Context): Promise<Response> {
    console.error('Unhandled error:', error)
    return c.json({
      success: false,
      message: '服务器错误',
      code: 'INTERNAL_SERVER_ERROR'
    }, 500 as ContentfulStatusCode)
  }
}

/**
 * 错误处理链
 */
export class ErrorHandlerChain {
  private readonly handlers: ErrorHandler[] = []

  constructor() {
    // 按优先级添加处理器
    this.handlers.push(new ZodErrorHandler())
    this.handlers.push(new AppErrorHandler())
    this.handlers.push(new GenericErrorHandler())
  }

  /**
   * 处理错误
   */
  async handle(error: unknown, c: Context): Promise<Response> {
    for (const handler of this.handlers) {
      if (handler.canHandle(error)) {
        return await handler.handle(error, c)
      }
    }
    
    // 由于 GenericErrorHandler 的 canHandle 总是返回 true，
    // 所以这里永远不会执行到，可以删除
    return await new GenericErrorHandler().handle(error, c)
  }
} 