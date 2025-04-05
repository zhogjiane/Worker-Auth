/**
 * 密码工具函数
 * 提供密码哈希和验证功能
 */

import { generateSalt, hashPassword as hashPasswordUtil, verifyPassword as verifyPasswordUtil } from './auth'

/**
 * 生成随机盐值
 * @returns 16字节的随机盐值
 */
export { generateSalt }

/**
 * 对密码进行哈希处理
 * @param password 原始密码
 * @returns 格式为 salt:hash 的哈希字符串
 */
export const hashPassword = async (password: string): Promise<string> => {
  return hashPasswordUtil(password)
}

/**
 * 验证密码
 * @param password 待验证的密码
 * @param hashedPassword 存储的哈希密码
 * @returns 密码是否匹配
 */
export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  try {
    return await verifyPasswordUtil(password, hashedPassword)
  } catch (error) {
    console.error('密码验证失败:', error)
    return false
  }
} 