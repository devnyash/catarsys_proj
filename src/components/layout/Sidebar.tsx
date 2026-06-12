import { motion } from 'framer-motion';
import {
  Home,
  Map,
  Store,
  Heart,
  Download,
  Settings,
  PlusCircle,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import type { Page } from '@/store/uiStore';
import { useDownloadStore } from '@/store/downloadStore';
import { useAuthStore } from '@/store/authStore';

interface NavItem {
  id: Page;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'home', icon: Home, label: 'Главная' },
  { id: 'profile', icon: Map, label: 'Профиль' },
  { id: 'downloads', icon: Download, label: 'Загрузки' },
  { id: 'favorites', icon: Heart, label: 'Избранное' },
  { id: 'cart', icon: Store, label: 'Корзина' },
  { id: 'settings', icon: Settings, label: 'Настройки' },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, setPublishModalOpen } = useUIStore();
  const { tasks } = useDownloadStore();
  const { isAuthenticated } = useAuthStore();

  const activeDownloads = tasks.filter((t) => t.status === 'downloading').length;

  return (
    <motion.aside
      initial={{ x: -64, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="fixed left-0 top-0 bottom-0 w-16 bg-background/90 backdrop-blur-xl border-r border-foreground/[0.06] z-40 flex flex-col items-center py-4"
    >
      {/* Logo */}
      <div className="mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-zinc-500 to-zinc-700 rounded-lg flex items-center justify-center shadow-lg shadow-zinc-500/20">
          <span className="text-foreground font-bold text-xs">C</span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col items-center gap-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={isActive ? 'sidebar-item-active' : 'sidebar-item'}
              title={item.label}
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.id === 'downloads' && activeDownloads > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-zinc-500 text-[8px] font-bold text-foreground rounded-full flex items-center justify-center">
                  {activeDownloads}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Publish Button - Only for authenticated users */}
      {isAuthenticated && (
        <button
          onClick={() => setPublishModalOpen(true)}
          className="sidebar-item mb-2 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-500/10"
          title="Опубликовать мод"
        >
          <PlusCircle className="w-[18px] h-[18px]" />
        </button>
      )}
    </motion.aside>
  );
}
