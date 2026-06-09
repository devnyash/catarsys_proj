import { create } from 'zustand';

export type Page = 'home' | 'profile' | 'downloads' | 'favorites' | 'cart' | 'settings' | 'credits';

interface UIState {
  currentPage: Page;
  sidebarCollapsed: boolean;
  searchFocused: boolean;
  authModal: 'none' | 'login' | 'register' | 'verify' | '2fa';
  publishModalOpen: boolean;
  setCurrentPage: (page: Page) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSearchFocused: (focused: boolean) => void;
  setAuthModal: (modal: 'none' | 'login' | 'register' | 'verify' | '2fa') => void;
  setPublishModalOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'home',
  sidebarCollapsed: false,
  searchFocused: false,
  authModal: 'none',
  publishModalOpen: false,

  setCurrentPage: (page) => set({ currentPage: page }),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSearchFocused: (focused) => set({ searchFocused: focused }),
  setAuthModal: (modal) => set({ authModal: modal }),
  setPublishModalOpen: (open) => set({ publishModalOpen: open }),
}));
