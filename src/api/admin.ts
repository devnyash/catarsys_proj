import { api } from './client';

export interface AdminStats {
  total_users: number;
  total_mods: number;
  pending_mods?: number;
  mods_pending_count?: number;
  total_purchases: number;
  total_revenue: number;
  active_subscriptions: number;
  open_tickets: number;
  downloads_today: number;
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  role: 'user' | 'moderator' | 'admin' | 'superadmin';
  balance: number;
  is_verified: boolean;
  avatar_url?: string | null;
  is_banned: boolean;
  created_at?: string | null;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  next_cursor?: string | null;
  has_more: boolean;
}

export interface AdminPendingMod {
  id: number;
  title: string;
  description?: string;
  category?: string;
  project?: string;
  price: number;
  status: string;
  author_id?: number;
  author_username?: string;
  created_at?: string | null;
}

export interface AdminPendingModsResponse {
  mods: AdminPendingMod[];
  next_cursor?: string | null;
  has_more: boolean;
}

function qs(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats'),

  listUsers: (params: { cursor?: string; limit?: number } = {}) =>
    api.get<AdminUsersResponse>(`/admin/users${qs(params)}`),

  banUser: (id: number, ban: boolean, reason?: string) =>
    api.put<{ message?: string }>(`/admin/users/${id}/ban`, { ban, reason }),

  setUserRole: (id: number, role: 'user' | 'moderator' | 'admin') =>
    api.put<{ message?: string }>(`/admin/users/${id}/role`, { role }),

  setUserBalance: (id: number, balance: number) =>
    api.put<{ message?: string }>(`/admin/users/${id}/balance`, { balance }),

  listPendingMods: (params: { cursor?: string; limit?: number } = {}) =>
    api.get<AdminPendingModsResponse>(`/admin/mods/pending${qs(params)}`),

  approveMod: (id: number, pin = false) =>
    api.post<{ message?: string }>(`/admin/mods/${id}/approve`, { pin }),

  rejectMod: (id: number, reason: string) =>
    api.post<{ message?: string }>(`/admin/mods/${id}/reject`, { reason }),

  banMod: (id: number, reason: string) =>
    api.post<{ message?: string }>(`/admin/mods/${id}/ban`, { reason }),
};
