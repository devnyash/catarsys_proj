import { create } from 'zustand';
import type { Download, DownloadTask } from '@/types';
import { api } from '@/api/client';

interface DownloadState {
  tasks: DownloadTask[];
  history: Download[];
  isExpanded: boolean;
  activeTaskCount: number;
  isLoading: boolean;
  addTask: (task: Omit<DownloadTask, 'id'>) => void;
  pauseTask: (taskId: number) => void;
  resumeTask: (taskId: number) => void;
  cancelTask: (taskId: number) => void;
  completeTask: (taskId: number) => void;
  updateProgress: (taskId: number, progress: number) => void;
  toggleExpanded: () => void;
  setExpanded: (expanded: boolean) => void;
  fetchDownloads: () => Promise<void>;
}

let nextId = 100;

export const useDownloadStore = create<DownloadState>((set) => ({
  tasks: [],
  history: [],
  isExpanded: false,
  activeTaskCount: 0,
  isLoading: false,

  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, { ...task, id: nextId++ }],
      activeTaskCount: state.activeTaskCount + 1,
    })),

  pauseTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'paused' as const, speed: '0 MB/s' } : t
      ),
    })),

  resumeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'downloading' as const, speed: '8.5 MB/s' } : t
      ),
    })),

  cancelTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
      activeTaskCount: Math.max(0, state.activeTaskCount - 1),
    })),

  completeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: 'completed' as const, progress: 100, speed: '0 MB/s' }
          : t
      ),
      activeTaskCount: Math.max(0, state.activeTaskCount - 1),
    })),

  updateProgress: (taskId, progress) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, progress: Math.min(100, progress) } : t
      ),
    })),

  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),
  setExpanded: (expanded) => set({ isExpanded: expanded }),

  fetchDownloads: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<{ downloads: Download[] }>('/downloads');
      set({ history: response.downloads, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },
}));
