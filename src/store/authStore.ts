import { create } from 'zustand';
import type { User } from '@/types';
import { api, ApiError } from '@/api/client';
import { authApi } from '@/api/auth';

function avatarCacheKey(id: number) {
  return `catarsys_avatar_${id}`;
}
function readCachedAvatar(id: number): string {
  try {
    const val = localStorage.getItem(avatarCacheKey(id)) || '';
    if (val.startsWith('/app/') || val.startsWith('/uploads/')) {
      localStorage.removeItem(avatarCacheKey(id));
      return '';
    }
    return val;
  } catch {
    return '';
  }
}
function writeCachedAvatar(id: number, avatar: string) {
  try {
    if (avatar) localStorage.setItem(avatarCacheKey(id), avatar);
    else localStorage.removeItem(avatarCacheKey(id));
  } catch {
    // ignore
  }
}

type AuthUserPayload = {
  id: number;
  email: string;
  username: string;
  role: User['role'];
  balance?: number;
  avatar_url?: string | null;
  is_verified?: boolean;
  created_at?: string | null;
};

function normalizeUser(user: AuthUserPayload): User {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.username,
    avatar: user.avatar_url || readCachedAvatar(user.id) || '',
    isVerified: Boolean(user.is_verified),
    isActive: true,
    isBanned: false,
    role: user.role,
    balance: user.balance ?? 0,
    followersCount: 0,
    followingCount: 0,
    socials: {},
    createdAt: user.created_at || new Date().toISOString(),
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  telegramLogin: () => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateBalance: (amount: number) => void;
  setBalance: (balance: number) => void;
  updateProfile: (data: Partial<Pick<User, 'displayName' | 'avatar' | 'username'>>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  telegramLogin: async () => {
    set({ isLoading: true });
    try {
      const initRes = await authApi.telegramInit();
      const { authorization_url, state } = initRes;
      sessionStorage.setItem('tg_oidc_state', state);
      window.location.href = authorization_url;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    }
    api.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const response = await authApi.getProfile();
      set({ user: normalizeUser(response), isAuthenticated: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        api.clearTokens();
        set({ user: null, isAuthenticated: false });
      }
    }
  },

  updateBalance: (amount: number) => {
    set((state) => ({
      user: state.user ? { ...state.user, balance: state.user.balance + amount } : null,
    }));
  },

  setBalance: (balance: number) => {
    set((state) => ({
      user: state.user ? { ...state.user, balance } : null,
    }));
  },

  updateProfile: async (data) => {
    const current = useAuthStore.getState().user;
    if (current && data.username && data.username !== current.username) {
      await authApi.updateProfile({ username: data.username } as never);
    }
    if (current && typeof data.avatar === 'string') {
      writeCachedAvatar(current.id, data.avatar);
    }
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            ...data,
            displayName: data.displayName ?? data.username ?? state.user.displayName,
            username: data.username ?? state.user.username,
          }
        : null,
    }));
  },
}));
