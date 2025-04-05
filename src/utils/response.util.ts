import { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

/**
 * 标准API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  code?: string
  errors?: any
}

/**
 * 分页响应格式
 */
export interface PaginatedResponse<T> extends ApiResponse {
  data: {
    items: T[]
    pagination: {
      total: number
      page: number
      page_size: number
      total_pages: number
    }
  }
}

/**
 * 响应工具类
 * 提供统一的API响应格式方法
 */
export class ResponseUtil {
  /**
   * 成功响应
   */
  static success<T>(c: Context, data: T, status: ContentfulStatusCode = 200): Response {
    return c.json({
      success: true,
      data
    }, status)
  }

  /**
   * 分页响应
   */
  static paginated<T>(
    c: Context, 
    items: T[], 
    total: number, 
    page: number, 
    pageSize: number, 
    status: ContentfulStatusCode = 200
  ): Response {
    return c.json({
      success: true,
      data: {
        items,
        pagination: {
          total,
          page,
          page_size: pageSize,
          total_pages: Math.ceil(total / pageSize)
        }
      }
    }, status)
  }

  /**
   * 错误响应
   */
  static error(
    c: Context, 
    message: string, 
    code: string = 'ERROR', 
    status: ContentfulStatusCode = 400, 
    errors?: any
  ): Response {
    return c.json({
      success: false,
      message,
      code,
      errors
    }, status)
  }
} 