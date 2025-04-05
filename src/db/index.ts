import { drizzle } from 'drizzle-orm/d1';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

/**
 * 创建数据库连接
 * @param d1 D1 数据库实例
 * @returns Drizzle 数据库实例
 */
export function createDb(d1: D1Database): DrizzleD1Database<typeof schema> {
  return drizzle(d1, { schema });
}

// 导出 schema 类型
export type DbSchema = typeof schema; 