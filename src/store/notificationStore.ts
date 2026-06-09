import { create } from 'zustand';
import type { Notification } from '@/types';
import { api } from '@/api/client';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'userId' | 'isRead'>) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get<{ notifications: Notification[] }>('/notifications');
      set({
        notifications: response.notifications,
        unreadCount: response.notifications.filter((n) => !n.isRead).length,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  markAsRead: async (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
    try {
      await api.post<void>(`/notifications/${notificationId}/read`);
    } catch {
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: false } : n
        ),
        unreadCount: state.unreadCount + 1,
      }));
    }
  },

  markAllAsRead: async () => {
    const prev = get().notifications;
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));
    try {
      await api.post<void>('/notifications/read-all');
    } catch {
      set({ notifications: prev, unreadCount: prev.filter((n) => !n.isRead).length });
    }
  },

  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        { ...notification, id: Date.now(), userId: 0, isRead: false },
        ...state.notifications,
      ],
      unreadCount: state.unreadCount + 1,
    })),
}));
