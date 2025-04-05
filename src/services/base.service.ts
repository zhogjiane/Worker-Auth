import { Env } from '../types/env'
import { BusinessError, NotFoundError } from '../errors/error.types'

/**
 * 基础服务类
 * 提供通用的错误处理和服务依赖注入功能
 */
export abstract class BaseService {
  protected constructor(protected readonly env: Env) {}

  /**
   * 抛出业务逻辑错误
   * @param message 错误信息
   * @param code 错误代码
   */
  protected throwBusinessError(message: string, code: string = 'BUSINESS_ERROR'): never {
    throw new BusinessError(message, code)
  }

  /**
   * 抛出资源未找到错误
   * @param message 错误信息
   * @param code 错误代码
   */
  protected throwNotFoundError(message: string, code: string = 'NOT_FOUND'): never {
    throw new NotFoundError(message, code)
  }

  /**
   * 检查资源是否存在
   * @param resource 资源对象
   * @param message 错误信息
   * @param code 错误代码
   */
  protected checkResourceExists<T>(resource: T | null | undefined, message: string, code: string = 'NOT_FOUND'): asserts resource is T {
    if (!resource) {
      this.throwNotFoundError(message, code)
    }
  }
} 