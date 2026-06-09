export type ModCategory = 'redux' | 'gun_pack' | 'clothes' | 'vehicle' | 'effects' | 'other';
export type ModProject = 'gta5rp' | 'majestic' | 'universal';
export type ModStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'banned';
export type UserRole = 'user' | 'moderator' | 'admin' | 'superadmin';
export type TransactionType = 'deposit' | 'purchase' | 'withdrawal' | 'earning';

export interface Mod {
  id: number;
  authorId: number;
  title: string;
  description: string;
  category: ModCategory;
  project: ModProject;
  price: number;
  downloadUrl: string;
  youtubeUrl?: string;
  telegramUrl?: string;
  status: ModStatus;
  isDangerous: boolean;
  requiresSubscription: boolean;
  subscriptionChannel?: string;
  rating: number;
  reviewsCount: number;
  downloadsCount: number;
  coverImage: string;
  galleryImages: string[];
  isPinned: boolean;
  pinnedUntil?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  author: User;
  tags: string[];
  version: string;
  fileSize: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  role: UserRole;
  telegramId?: string;
  balance: number;
  followersCount: number;
  followingCount: number;
  socials: {
    telegram?: string;
    telegramChannel?: string;
    discord?: string;
    youtube?: string;
  };
  createdAt: string;
}

export interface Review {
  id: number;
  modId: number;
  userId: number;
  user: User;
  score: number;
  comment: string;
  createdAt: string;
}

export interface Purchase {
  id: number;
  userId: number;
  modId: number;
  mod: Mod;
  amountPaid: number;
  createdAt: string;
}

export interface Download {
  id: number;
  userId: number;
  modId: number;
  mod: Mod;
  createdAt: string;
}

export interface Favorite {
  id: number;
  userId: number;
  modId: number;
  mod: Mod;
  createdAt: string;
}

export interface Transaction {
  id: number;
  userId: number;
  type: TransactionType;
  description: string;
  amount: number;
  createdAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface CartItem {
  mod: Mod;
  quantity: number;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  uiScale: number;
  autoUpdate: boolean;
  notifyApp: boolean;
  notifyTelegram: boolean;
  downloadPath: string;
}

export interface DownloadTask {
  id: number;
  modId: number;
  modTitle: string;
  progress: number;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'error';
  speed: string;
  totalSize: string;
  downloadedSize: string;
}
