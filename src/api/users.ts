import { api } from './client';
import type { User, Mod } from '@/types';

export interface UserProfileResponse {
  user: User;
}

export interface UserModsResponse {
  mods: Mod[];
  nextCursor?: string;
  total: number;
}

export const usersApi = {
  getProfile: (userId: number) =>
    api.get<UserProfileResponse>(`/users/${userId}`),

  getUserMods: (userId: number, cursor?: string, limit?: number) => {
    const params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = String(limit);
    const query = new URLSearchParams(params).toString();
    return api.get<UserModsResponse>(`/users/${userId}/mods${query ? `?${query}` : ''}`);
  },
};
