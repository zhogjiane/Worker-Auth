import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { DbSchema } from '../db';
import type { SQLiteTransaction } from 'drizzle-orm/sqlite-core';
import type { D1Result } from '@cloudflare/workers-types';
import type { ExtractTablesWithRelations } from 'drizzle-orm';

// 使用 ExtractTablesWithRelations 来获取正确的表关系类型
type SchemaType = ExtractTablesWithRelations<typeof import('../db/schema')>;
type TransactionType = SQLiteTransaction<'async', D1Result<unknown>, SchemaType, SchemaType>;

/**
 * 事务传播行为枚举
 */
export enum TransactionPropagation {
  /** 如果当前没有事务，就新建一个事务，如果已经存在事务，就加入到这个事务中 */
  REQUIRED = 'REQUIRED',
  /** 如果当前没有事务，就新建一个事务，如果已经存在事务，就抛出异常 */
  REQUIRES_NEW = 'REQUIRES_NEW',
  /** 如果当前没有事务，就以非事务方式执行，如果已经存在事务，就加入到这个事务中 */
  SUPPORTS = 'SUPPORTS',
  /** 如果当前没有事务，就以非事务方式执行，如果已经存在事务，就抛出异常 */
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  /** 如果当前没有事务，就以非事务方式执行，如果已经存在事务，就抛出异常 */
  NEVER = 'NEVER',
}

/**
 * 事务工具类
 * 用于统一管理数据库事务
 */
export class TransactionUtil {
  private static readonly transactionContext: Map<string, any> = new Map();

  /**
   * 执行事务
   * @param db Drizzle 数据库实例
   * @param callback 事务回调函数
   * @param propagation 事务传播行为
   * @returns 事务执行结果
   */
  static async execute<T>(
    db: DrizzleD1Database<DbSchema>,
    callback: (tx: TransactionType) => Promise<T>,
    propagation: TransactionPropagation = TransactionPropagation.REQUIRED
  ): Promise<T> {
    const contextKey = this.getContextKey();
    const existingTx = this.transactionContext.get(contextKey);

    try {
      switch (propagation) {
        case TransactionPropagation.REQUIRED:
          if (existingTx) {
            return await callback(existingTx as TransactionType);
          }
          return await db.transaction(callback as any);

        case TransactionPropagation.REQUIRES_NEW:
          if (existingTx) {
            throw new Error('Nested transaction not supported');
          }
          return await db.transaction(callback as any);

        case TransactionPropagation.SUPPORTS:
          if (existingTx) {
            return await callback(existingTx as TransactionType);
          }
          return await callback(db as unknown as TransactionType);

        case TransactionPropagation.NOT_SUPPORTED:
          if (existingTx) {
            throw new Error('Transaction not supported in this context');
          }
          return await callback(db as unknown as TransactionType);

        case TransactionPropagation.NEVER:
          if (existingTx) {
            throw new Error('Transaction not allowed in this context');
          }
          return await callback(db as unknown as TransactionType);

        default:
          throw new Error(`Unsupported transaction propagation: ${propagation}`);
      }
    } catch (error) {
      // 记录错误日志
      console.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * 获取事务上下文键
   * @returns 上下文键
   */
  private static getContextKey(): string {
    // 这里可以根据实际需求生成更复杂的上下文键
    return 'default';
  }
}

/**
 * 事务包装函数
 * @param db 数据库实例
 * @param fn 要执行的函数
 * @param propagation 事务传播行为
 * @returns 包装后的函数
 */
export function withTransaction<T extends (...args: any[]) => Promise<any>>(
  db: DrizzleD1Database<DbSchema>,
  fn: T,
  propagation: TransactionPropagation = TransactionPropagation.REQUIRED
): T {
  return (async (...args: Parameters<T>) => {
    return await TransactionUtil.execute(
      db,
      async (tx) => {
        // 创建一个新的函数上下文，将数据库实例替换为事务实例
        const boundFn = fn.bind({ drizzle: tx });
        return await boundFn(...args);
      },
      propagation
    );
  }) as T;
} 