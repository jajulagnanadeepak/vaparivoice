import { apiClient } from '@/lib/api-client';
import type { CurrentUser, ForgotPasswordRequest, LoginRequest, MessageResponse, RegisterRequest, ResetPasswordRequest } from '@/types';

export const authService = {
  /** Sets HTTP-only cookies server-side; returns the user profile. */
  login: (body: LoginRequest) => apiClient.post<CurrentUser>('/auth/login', body).then((r) => r.data),
  register: (body: RegisterRequest) => apiClient.post<CurrentUser>('/auth/register', body).then((r) => r.data),
  logout: () => apiClient.post<void>('/auth/logout').then(() => undefined),
  me: () => apiClient.get<CurrentUser>('/auth/me').then((r) => r.data),
  forgotPassword: (body: ForgotPasswordRequest) => apiClient.post<MessageResponse>('/auth/forgot-password', body).then((r) => r.data),
  resetPassword: (body: ResetPasswordRequest) => apiClient.post<MessageResponse>('/auth/reset-password', body).then((r) => r.data),
};
