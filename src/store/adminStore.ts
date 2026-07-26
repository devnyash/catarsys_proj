import { create } from 'zustand';
import type { User, Mod, UserRole, ModStatus } from '@/types';
import { mockUsers, mockMods } from '@/data/mock';

export interface ModerationLog {
  id: number;
  modId: number;
  modTitle: string;
  action: 'approved' | 'rejected' | 'banned';
  reason?: string;
  createdAt: string;
}

interface AdminState {
  users: User[];
  mods: Mod[];
  logs: ModerationLog[];
  setRole: (userId: number, role: UserRole) => void;
  toggleBan: (userId: number) => void;
  toggleVerify: (userId: number) => void;
  approveMod: (modId: number) => void;
  rejectMod: (modId: number, reason: string) => void;
  banMod: (modId: number, reason: string) => void;
  deleteMod: (modId: number) => void;
}

// Seed a few mods into the moderation queue so it is not empty in the demo.
const seedStatuses: ModStatus[] = ['pending', 'pending', 'rejected'];
const seededMods: Mod[] = mockMods.map((m, i) =>
  i < seedStatuses.length ? { ...m, status: seedStatuses[i] } : m
);

let logCounter = 1;
const makeLog = (
  mod: Mod,
  action: ModerationLog['action'],
  reason?: string
): ModerationLog => ({
  id: Date.now() * 100 + logCounter++,
  modId: mod.id,
  modTitle: mod.title,
  action,
  reason,
  createdAt: new Date().toISOString(),
});

export const useAdminStore = create<AdminState>((set) => ({
  users: mockUsers.map((u) => ({ ...u })),
  mods: seededMods,
  logs: [],

  setRole: (userId, role) =>
    set((state) => ({
      users: state.users.map((u) => (u.id === userId ? { ...u, role } : u)),
    })),

  toggleBan: (userId) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, isBanned: !u.isBanned, isActive: u.isBanned } : u
      ),
    })),

  toggleVerify: (userId) =>
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, isVerified: !u.isVerified } : u
      ),
    })),

  approveMod: (modId) =>
    set((state) => {
      const mod = state.mods.find((m) => m.id === modId);
      return {
        mods: state.mods.map((m) =>
          m.id === modId ? { ...m, status: 'approved' as ModStatus } : m
        ),
        logs: mod ? [makeLog(mod, 'approved'), ...state.logs] : state.logs,
      };
    }),

  rejectMod: (modId, reason) =>
    set((state) => {
      const mod = state.mods.find((m) => m.id === modId);
      return {
        mods: state.mods.map((m) =>
          m.id === modId ? { ...m, status: 'rejected' as ModStatus } : m
        ),
        logs: mod ? [makeLog(mod, 'rejected', reason), ...state.logs] : state.logs,
      };
    }),

  banMod: (modId, reason) =>
    set((state) => {
      const mod = state.mods.find((m) => m.id === modId);
      return {
        mods: state.mods.map((m) =>
          m.id === modId ? { ...m, status: 'banned' as ModStatus } : m
        ),
        logs: mod ? [makeLog(mod, 'banned', reason), ...state.logs] : state.logs,
      };
    }),

  deleteMod: (modId) =>
    set((state) => ({
      mods: state.mods.map((m) =>
        m.id === modId ? { ...m, isDeleted: true } : m
      ),
    })),
}));
