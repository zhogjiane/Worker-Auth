import { D1Database } from '@cloudflare/workers-types'

export class BaseService {
  protected db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  /**
   * 更新记录时自动设置 updated_at 字段
   * @param tableName 表名
   * @param id 记录ID
   * @param data 更新数据
   */
  protected async update(tableName: string, id: number, data: Record<string, any>) {
    const fields = Object.keys(data)
    const values = Object.values(data)
    
    // 添加 updated_at 字段
    fields.push('updated_at')
    values.push(new Date().toISOString())
    
    const setClause = fields.map((field, index) => `${field} = ?`).join(', ')
    const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`
    
    return await this.db
      .prepare(query)
      .bind(...values, id)
      .run()
  }
} 