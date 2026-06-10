import { api } from './client';
import type { User } from '@/types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface Verify2FARequest {
  email: string;
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse {
  user: Pick<User, 'id' | 'email' | 'username' | 'role'>;
  balance?: number;
  tokens: AuthTokens;
  requires_2fa?: boolean;
  message?: string;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
}

export interface VerifyEmailResponse {
  verified: boolean;
}

export interface Verify2FAResponse {
  user: Pick<User, 'id' | 'email' | 'username' | 'role'>;
  balance?: number;
  tokens: AuthTokens;
}

export interface ProfileResponse {
  id: number;
  email: string;
  username: string;
  avatar_url?: string | null;
  role: User['role'];
  balance: number;
  is_verified: boolean;
  bio?: string | null;
  created_at?: string | null;
}

export const authApi = {
  register: (data: RegisterRequest) =>
    api.post<RegisterResponse>('/auth/register', data),

  verifyEmail: (data: VerifyEmailRequest) =>
    api.post<VerifyEmailResponse>('/auth/verify-email', data),

  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data),

  verify2FA: (data: Verify2FARequest) =>
    api.post<Verify2FAResponse>('/auth/verify-2fa', data),

  refreshToken: () =>
    api.post<{ access_token: string; refresh_token: string }>('/auth/refresh'),

  logout: () =>
    api.post<void>('/auth/logout'),

  forgotPassword: (data: ForgotPasswordRequest) =>
    api.post<void>('/auth/forgot-password', data),

  resetPassword: (data: ResetPasswordRequest) =>
    api.post<void>('/auth/reset-password', data),

  getProfile: () =>
    api.get<ProfileResponse>('/auth/me'),

  updateProfile: (data: Partial<User>) =>
    api.put<User>('/auth/me', data),
};
