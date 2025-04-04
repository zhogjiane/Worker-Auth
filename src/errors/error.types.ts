/**
 * 自定义错误类型
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_SERVER_ERROR'
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(message: string, public errors: any) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends AppError {
  constructor(message: string, code: string = 'AUTHENTICATION_ERROR') {
    super(message, 401, code)
    this.name = 'AuthenticationError'
  }
}

/**
 * 授权错误
 */
export class AuthorizationError extends AppError {
  constructor(message: string, code: string = 'AUTHORIZATION_ERROR') {
    super(message, 403, code)
    this.name = 'AuthorizationError'
  }
}

/**
 * 资源不存在错误
 */
export class NotFoundError extends AppError {
  constructor(message: string, code: string = 'NOT_FOUND_ERROR') {
    super(message, 404, code)
    this.name = 'NotFoundError'
  }
}

/**
 * 业务逻辑错误
 */
export class BusinessError extends AppError {
  constructor(message: string, code: string = 'BUSINESS_ERROR') {
    super(message, 400, code)
    this.name = 'BusinessError'
  }
} 