import { create } from 'zustand';
import type { Mod, ModCategory, ModProject } from '@/types';
import { modsApi } from '@/api/mods';
import type { ModListParams } from '@/api/mods';

interface ModFilters {
  category: ModCategory | 'all';
  project: ModProject | 'all';
  search: string;
  sortBy: 'popular' | 'newest' | 'price_asc' | 'price_desc';
  priceRange: 'all' | 'free' | 'paid';
}

interface ModState {
  mods: Mod[];
  isLoading: boolean;
  error: string | null;
  filters: ModFilters;
  selectedMod: Mod | null;
  isDetailOpen: boolean;
  setFilters: (filters: Partial<ModFilters>) => void;
  setSelectedMod: (mod: Mod | null) => void;
  setDetailOpen: (open: boolean) => void;
  fetchMods: () => Promise<void>;
  searchMods: (query: string) => Promise<void>;
  fetchModById: (id: number) => Promise<void>;
  getFilteredMods: () => Mod[];
}

export const useModStore = create<ModState>((set, get) => ({
  mods: [],
  isLoading: false,
  error: null,
  filters: {
    category: 'all',
    project: 'all',
    search: '',
    sortBy: 'popular',
    priceRange: 'all',
  },
  selectedMod: null,
  isDetailOpen: false,

  setFilters: (newFilters) =>
    set((state) => ({ filters: { ...state.filters, ...newFilters } })),

  setSelectedMod: (mod) => set({ selectedMod: mod }),
  setDetailOpen: (open) => set({ isDetailOpen: open }),

  fetchMods: async () => {
    set({ isLoading: true, error: null });
    try {
      const { category, project, sortBy } = get().filters;
      const params: ModListParams = {};
      if (category !== 'all') params.category = category;
      if (project !== 'all') params.project = project;
      if (sortBy !== 'popular') params.sort = sortBy;
      const response = await modsApi.list(params);
      set({ mods: response.mods, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load mods';
      set({ error: message, isLoading: false });
    }
  },

  searchMods: async (query) => {
    set({ isLoading: true, error: null });
    try {
      const { category, project } = get().filters;
      const response = await modsApi.search({
        q: query,
        category: category !== 'all' ? category : undefined,
        project: project !== 'all' ? project : undefined,
      });
      set({ mods: response.mods, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      set({ error: message, isLoading: false });
    }
  },

  fetchModById: async (id) => {
    try {
      const mod = await modsApi.getById(id);
      set({ selectedMod: mod });
    } catch {
      // silently fail – mod may already be in local state
    }
  },

  getFilteredMods: () => {
    const state = get();
    let filtered = [...state.mods];

    if (state.filters.category !== 'all') {
      filtered = filtered.filter((m) => m.category === state.filters.category);
    }

    if (state.filters.project !== 'all') {
      filtered = filtered.filter((m) => m.project === state.filters.project);
    }

    if (state.filters.search) {
      const q = state.filters.search.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.author.displayName.toLowerCase().includes(q)
      );
    }

    if (state.filters.priceRange === 'free') {
      filtered = filtered.filter((m) => m.price === 0);
    } else if (state.filters.priceRange === 'paid') {
      filtered = filtered.filter((m) => m.price > 0);
    }

    switch (state.filters.sortBy) {
      case 'popular':
        filtered.sort((a, b) => b.downloadsCount - a.downloadsCount);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
    }

    return filtered;
  },
}));
