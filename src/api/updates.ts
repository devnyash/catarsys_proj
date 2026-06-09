import { api } from './client';

export interface AppUpdate {
  version: string;
  releaseDate: string;
  changelog: string;
  downloadUrl: string;
  isUrgent: boolean;
}

export interface UpdateHistoryItem {
  version: string;
  releaseDate: string;
  changelog: string;
}

export const updatesApi = {
  getLatest: () =>
    api.get<AppUpdate>('/app/updates/latest'),

  getHistory: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<UpdateHistoryItem[]>(`/app/updates/history${query}`);
  },
};
