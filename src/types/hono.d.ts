import 'hono'
import type { 
  CreatePermissionRequest, 
  UpdatePermissionRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignRoleRequest,
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest
} from './auth'

declare module 'hono' {
  interface ContextVariableMap {
    valid: CreatePermissionRequest | UpdatePermissionRequest | CreateRoleRequest | UpdateRoleRequest | AssignRoleRequest | RegisterRequest | LoginRequest | RefreshTokenRequest
  }
} 