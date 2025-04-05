import { MiddlewareHandler } from 'hono'
import { validator } from 'hono/validator'
import { z } from 'zod'
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema,
  createRoleSchema,
  updateRoleSchema,
  assignRoleSchema,
  createPermissionSchema,
  updatePermissionSchema
} from '../types/auth'

/**
 * 创建 Zod 验证中间件
 * @param schema Zod 验证模式
 * @returns Hono 中间件
 */
const createZodValidator = <T extends z.ZodType>(schema: T): MiddlewareHandler => {
  return validator('json', async (value, c) => {
    try {
      const result = await schema.parseAsync(value)
      // 将验证结果存储在 c.req.valid 中
      c.set('valid', result)
      return result
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          success: false,
          message: '验证失败',
          code: 'VALIDATION_ERROR',
          errors: error.errors
        }, 400)
      }
      throw error
    }
  })
}

// 导出预定义的验证中间件
export const validateRegister = createZodValidator(registerSchema)
export const validateLogin = createZodValidator(loginSchema)
export const validateRefreshToken = createZodValidator(refreshTokenSchema)
export const validateCreateRole = createZodValidator(createRoleSchema)
export const validateUpdateRole = createZodValidator(updateRoleSchema)
export const validateAssignRole = createZodValidator(assignRoleSchema)
export const validateCreatePermission = createZodValidator(createPermissionSchema)
export const validateUpdatePermission = createZodValidator(updatePermissionSchema) 