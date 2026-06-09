import { create } from 'zustand';
import type { User, AppSettings } from '@/types';
import { api } from '@/api/client';
import { authApi } from '@/api/auth';

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
  } catch {}
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; needs_2fa?: boolean; temp_token?: string }>;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  verifyEmail: (code: string) => Promise<boolean>;
  verify2FA: (code: string, tempToken: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  updateBalance: (amount: number) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login({ email, password });
      if (response.needs_2fa) {
        set({ isLoading: false });
        return { success: false, needs_2fa: true, temp_token: response.temp_token };
      }
      api.setTokens(response.tokens.access_token, response.tokens.refresh_token);
      applySavedTheme();
      set({ user: response.user, isAuthenticated: true, isLoading: false });
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
      set({ isLoading: false });
      return true;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  verifyEmail: async (code) => {
    try {
      await authApi.verifyEmail({ code });
      return true;
    } catch {
      return false;
    }
  },

  verify2FA: async (code, tempToken) => {
    set({ isLoading: true });
    try {
      const response = await authApi.verify2FA({ code, tempToken });
      api.setTokens(response.tokens.access_token, response.tokens.refresh_token);
      applySavedTheme();
      set({ user: response.user, isAuthenticated: true, isLoading: false });
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
    set({ user: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    try {
      const response = await authApi.getProfile();
      set({ user: response.user, isAuthenticated: true });
    } catch {
      api.clearTokens();
      set({ user: null, isAuthenticated: false });
    }
  },

  updateBalance: (amount: number) => {
    set((state) => ({
      user: state.user ? { ...state.user, balance: state.user.balance + amount } : null,
    }));
  },
}));
