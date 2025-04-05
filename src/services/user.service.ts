import { eq, and, sql } from 'drizzle-orm'
import type { DrizzleD1Database } from 'drizzle-orm/d1'
import { users, userRoles } from '../db/schema'
import { hashPassword, verifyPassword } from '../utils/password.util.js'
import { UserRoleEnum } from '../types/auth'
import type { DbSchema } from '../db'
import { withTransaction, TransactionPropagation } from '../utils/transaction.util'

export class UserService {
  // 暂时使用 any 类型解决类型问题
  private findByEmailStmt: any | null = null
  private findByUsernameStmt: any | null = null
  private getUserRolesStmt: any | null = null

  constructor(
    private readonly drizzle: DrizzleD1Database<DbSchema>
  ) {}

  /**
   * 懒加载初始化 findByEmail prepared statement
   */
  private initFindByEmailStmt() {
    if (!this.findByEmailStmt) {
      this.findByEmailStmt = this.drizzle
        .select()
        .from(users)
        .where(eq(users.email, sql.placeholder('email')))
        .prepare()
    }
    return this.findByEmailStmt
  }

  /**
   * 懒加载初始化 findByUsername prepared statement
   */
  private initFindByUsernameStmt() {
    if (!this.findByUsernameStmt) {
      this.findByUsernameStmt = this.drizzle
        .select()
        .from(users)
        .where(eq(users.username, sql.placeholder('username')))
        .prepare()
    }
    return this.findByUsernameStmt
  }

  /**
   * 懒加载初始化 getUserRoles prepared statement
   */
  private initGetUserRolesStmt() {
    if (!this.getUserRolesStmt) {
      this.getUserRolesStmt = this.drizzle
        .select({ roleId: userRoles.roleId })
        .from(userRoles)
        .where(eq(userRoles.userId, sql.placeholder('userId')))
        .prepare()
    }
    return this.getUserRolesStmt
  }

  /**
   * 创建新用户
   * @param userData 用户数据
   */
  createUser = withTransaction(
    this.drizzle,
    async (userData: {
      email: string;
      password: string;
      username: string;
      role?: UserRoleEnum;
    }) => {
      // 检查邮箱是否已存在
      const existingUser = await this.drizzle
        .select()
        .from(users)
        .where(eq(users.email, userData.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error('邮箱已被注册');
      }

      // 检查用户名是否已存在
      const existingUsername = await this.drizzle
        .select()
        .from(users)
        .where(eq(users.username, userData.username))
        .limit(1);

      if (existingUsername.length > 0) {
        throw new Error('用户名已被使用');
      }

      // 创建用户
      const [user] = await this.drizzle
        .insert(users)
        .values({
          email: userData.email,
          passwordHash: await hashPassword(userData.password),
          username: userData.username,
          verificationStatus: 'PENDING',
          isActive: sql`1`,
          role: userData.role ?? UserRoleEnum.USER,
        })
        .returning();

      if (!user) {
        throw new Error('用户创建失败');
      }

      return user;
    },
    TransactionPropagation.REQUIRED
  );

  /**
   * 通过邮箱查找用户
   */
  async findByEmail(email: string) {
    const stmt = this.initFindByEmailStmt()
    if (!stmt) {
      throw new Error('Failed to initialize findByEmail statement')
    }
    const result = await stmt.execute({ email }) as typeof users.$inferSelect[];
    return result[0];
  }

  /**
   * 通过用户名查找用户
   */
  async findByUsername(username: string) {
    const stmt = this.initFindByUsernameStmt()
    if (!stmt) {
      throw new Error('Failed to initialize findByUsername statement')
    }
    const result = await stmt.execute({ username }) as typeof users.$inferSelect[];
    return result[0];
  }

  /**
   * 更新用户信息
   */
  async updateUser(userId: number, userData: Partial<typeof users.$inferInsert>) {
    const [updatedUser] = await this.drizzle
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  /**
   * 更新用户密码
   */
  async updatePassword(userId: number, newPassword: string) {
    const [updatedUser] = await this.drizzle
      .update(users)
      .set({
        passwordHash: await hashPassword(newPassword),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  /**
   * 验证用户密码
   */
  async verifyPassword(userId: number, password: string): Promise<boolean> {
    const user = await this.drizzle
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    if (!user[0]) {
      return false;
    }

    return verifyPassword(password, user[0].passwordHash);
  }

  /**
   * 获取用户角色
   */
  async getUserRoles(userId: number) {
    const stmt = this.initGetUserRolesStmt()
    if (!stmt) {
      throw new Error('Failed to initialize getUserRoles statement')
    }
    const result = await stmt.execute({ userId }) as { roleId: number }[];
    return result.map(r => r.roleId);
  }

  /**
   * 添加用户角色
   */
  async addUserRole(userId: number, roleId: number) {
    const [userRole] = await this.drizzle
      .insert(userRoles)
      .values({
        userId,
        roleId,
      })
      .returning();
    return userRole;
  }

  /**
   * 移除用户角色
   */
  async removeUserRole(userId: number, roleId: number) {
    await this.drizzle
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.roleId, roleId)
        )
      );
  }
} 