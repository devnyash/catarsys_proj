import { create } from 'zustand';
import { modsApi } from '@/api/mods';
import { api } from '@/api/client';
import type { Favorite } from '@/types';

interface FavoriteState {
  favorites: number[];
  favoriteDetails: Favorite[];
  isLoading: boolean;
  fetchFavorites: () => Promise<void>;
  toggleFavorite: (modId: number) => Promise<void>;
  isFavorite: (modId: number) => boolean;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  favoriteDetails: [],
  isLoading: false,

  fetchFavorites: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<{ favorites: Favorite[] }>('/favorites');
      set({
        favorites: response.favorites.map((f) => f.modId),
        favoriteDetails: response.favorites,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleFavorite: async (modId) => {
    const isCurrentlyFavorited = get().favorites.includes(modId);
    set((state) => ({
      favorites: isCurrentlyFavorited
        ? state.favorites.filter((id) => id !== modId)
        : [...state.favorites, modId],
    }));
    try {
      await modsApi.toggleFavorite(modId);
    } catch {
      set((state) => ({
        favorites: isCurrentlyFavorited
          ? [...state.favorites, modId]
          : state.favorites.filter((id) => id !== modId),
      }));
    }
  },

  isFavorite: (modId) => get().favorites.includes(modId),
}));
