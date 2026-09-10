import { api } from './client';
import type { User } from '@/types';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse {
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
  telegramInit: () =>
    api.post<{ authorization_url: string; state: string }>('/auth/telegram/init'),
  telegramCallback: (data: { code: string; state: string }) =>
    api.post<LoginResponse>('/auth/telegram/callback', data),

  refreshToken: () =>
    api.post<{ access_token: string; refresh_token: string }>('/auth/refresh'),

  logout: () =>
    api.post<void>('/auth/logout'),

  getProfile: () =>
    api.get<ProfileResponse>('/auth/me'),

  updateProfile: (data: Partial<User>) =>
    api.put<User>('/auth/me', data),
};
