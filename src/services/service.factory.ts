import { Env } from '../types/env'
import { AuthService } from './auth.service'
import { IpService } from './ip.service'

/**
 * 服务工厂接口
 */
export interface IServiceFactory {
  getAuthService(): AuthService
  getIpService(): IpService
}

/**
 * 服务工厂实现类
 */
export class ServiceFactory implements IServiceFactory {
  private authService: AuthService | null = null
  private ipService: IpService | null = null

  constructor(private readonly env: Env) {}

  /**
   * 获取认证服务实例
   */
  getAuthService(): AuthService {
    if (!this.authService) {
      this.authService = new AuthService(this.env)
    }
    return this.authService
  }

  /**
   * 获取IP服务实例
   */
  getIpService(): IpService {
    if (!this.ipService) {
      this.ipService = new IpService(this.env)
    }
    return this.ipService
  }
} 