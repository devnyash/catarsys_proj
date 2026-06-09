import { api } from './client';
import type { Mod, Review } from '@/types';

function buildQuery(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      sp.set(k, String(v));
    }
  }
  return sp.toString();
}

export interface ModListParams {
  [key: string]: unknown;
  category?: string;
  project?: string;
  sort?: string;
  cursor?: string;
  limit?: number;
}

export interface ModSearchParams {
  [key: string]: unknown;
  q: string;
  category?: string;
  project?: string;
  limit?: number;
  cursor?: string;
}

export interface ModCreateRequest {
  title: string;
  description: string;
  category: string;
  project: string;
  price: number;
  downloadUrl: string;
  youtubeUrl?: string;
  telegramUrl?: string;
  coverImage: string;
  galleryImages?: string[];
  tags?: string[];
  requiresSubscription?: boolean;
  subscriptionChannel?: string;
}

export interface ModUpdateRequest {
  title?: string;
  description?: string;
  category?: string;
  project?: string;
  price?: number;
  downloadUrl?: string;
  youtubeUrl?: string;
  telegramUrl?: string;
  coverImage?: string;
  galleryImages?: string[];
  tags?: string[];
  requiresSubscription?: boolean;
  subscriptionChannel?: string;
}

export interface ModListResponse {
  mods: Mod[];
  nextCursor?: string;
  total: number;
}

export interface ModSearchResponse {
  mods: Mod[];
  nextCursor?: string;
  total: number;
}

export interface RateModRequest {
  rating: number;
}

export interface RateModResponse {
  review: Review;
  newRating: number;
}

export interface ToggleFavoriteResponse {
  favorited: boolean;
}

export interface DownloadResponse {
  downloadUrl: string;
  expiresAt: string;
}

export const modsApi = {
  list: (params?: ModListParams) => {
    const query = params ? buildQuery(params) : '';
    return api.get<ModListResponse>(`/mods${query ? `?${query}` : ''}`);
  },

  search: (params: ModSearchParams) => {
    const query = buildQuery(params);
    return api.get<ModSearchResponse>(`/mods/search?${query}`);
  },

  getById: (id: number) =>
    api.get<Mod>(`/mods/${id}`),

  create: (data: ModCreateRequest) =>
    api.post<Mod>('/mods', data),

  update: (id: number, data: ModUpdateRequest) =>
    api.put<Mod>(`/mods/${id}`, data),

  delete: (id: number) =>
    api.delete<void>(`/mods/${id}`),

  requestDownload: (id: number) =>
    api.post<DownloadResponse>(`/mods/${id}/request-download`),

  rate: (id: number, data: RateModRequest) =>
    api.post<RateModResponse>(`/mods/${id}/rate`, data),

  toggleFavorite: (id: number) =>
    api.post<ToggleFavoriteResponse>(`/mods/${id}/favorite`),
};
