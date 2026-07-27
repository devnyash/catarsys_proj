import { create } from 'zustand';
import type { User, AppSettings } from '@/types';
import { api, ApiError } from '@/api/client';
import { authApi } from '@/api/auth';

// The backend /auth/me does not yet persist avatars, so we cache the user's
// chosen avatar locally (per user id) to keep it across page reloads.
function avatarCacheKey(id: number) {
  return `catarsys_avatar_${id}`;
}
function readCachedAvatar(id: number): string {
  try {
    return localStorage.getItem(avatarCacheKey(id)) || '';
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

function applySavedTheme() {
  try {
    const raw = localStorage.getItem('catarsys_settings');
    if (raw) {
      const settings: AppSettings = JSON.parse(raw);
      const resolved = settings.theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : settings.theme;
      document.documentElement.classList.toggle('dark', resolved === 'dark');
    }
  } catch (error) {}
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
    // Empty string => UI renders the first letter of the name as a fallback.
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
  pendingEmail: string;
  login: (email: string, password: string) => Promise<{ success: boolean; needs_2fa?: boolean; temp_token?: string }>;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  verifyEmail: (code: string) => Promise<boolean>;
  verify2FA: (code: string, tempToken: string) => Promise<boolean>;
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
  pendingEmail: '',

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login({ email, password });
      if (response.requires_2fa) {
        set({ isLoading: false, pendingEmail: email });
        return { success: false, needs_2fa: true };
      }
      api.setTokens(response.tokens.access_token, response.tokens.refresh_token);
      applySavedTheme();
      set({
        user: normalizeUser({ ...response.user, balance: response.balance }),
        isAuthenticated: true,
        isLoading: false,
        pendingEmail: '',
      });
      return { success: true };
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true });
    try {
      await authApi.register({ email, username, password });
      set({ isLoading: false, pendingEmail: email });
      return true;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  verifyEmail: async (code) => {
    try {
      const { pendingEmail: email } = useAuthStore.getState();
      if (!email) return false;
      await authApi.verifyEmail({ email, code });
      return true;
    } catch {
      return false;
    }
  },

  verify2FA: async (code) => {
    set({ isLoading: true });
    try {
      const { pendingEmail: email } = useAuthStore.getState();
      if (!email) {
        set({ isLoading: false });
        return false;
      }
      const response = await authApi.verify2FA({ email, code });
      api.setTokens(response.tokens.access_token, response.tokens.refresh_token);
      applySavedTheme();
      set({
        user: normalizeUser({ ...response.user, balance: response.balance }),
        isAuthenticated: true,
        isLoading: false,
        pendingEmail: '',
      });
      return true;
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
    set({ user: null, isAuthenticated: false, pendingEmail: '' });
  },

  fetchProfile: async () => {
    try {
      const response = await authApi.getProfile();
      set({ user: normalizeUser(response), isAuthenticated: true });
    } catch (error) {
      // Only log the user out on a genuine auth failure (401). Network errors
      // or transient server issues must NOT drop the session on page refresh.
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
    // Persist username to the backend (avatar is cached locally for now).
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
