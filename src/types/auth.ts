import type { LanguageCode, Role, UUID } from './common';

export interface LoginRequest { email: string; password: string }
export interface RegisterRequest { full_name: string; email: string; phone?: string; password: string }
export interface ForgotPasswordRequest { email: string }
export interface ResetPasswordRequest { token: string; new_password: string }
export interface MessageResponse { message: string }

export interface ShopMembership {
  shop_id: UUID;
  shop_name: string;
  role: Role;
}

export interface CurrentUser {
  id: UUID;
  full_name: string;
  email: string;
  preferred_language: LanguageCode;
  memberships: ShopMembership[];
  /** Server-computed permission codes for the active shop, e.g. "product:write". */
  permissions: string[];
}
