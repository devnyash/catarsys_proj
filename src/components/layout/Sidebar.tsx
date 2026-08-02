import { motion } from 'framer-motion';
import {
  Home,
  Store,
  Heart,
  Download,
  Settings,
  PlusCircle,
  Shield,
  User,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import type { Page } from '@/store/uiStore';
import { useDownloadStore } from '@/store/downloadStore';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import UserAvatar from '@/components/ui/UserAvatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface NavItem {
  id: Page;
  icon: React.ElementType;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'downloads', icon: Download, label: 'Загрузки' },
  { id: 'favorites', icon: Heart, label: 'Избранное' },
  { id: 'settings', icon: Settings, label: 'Настройки' },
];

export default function Sidebar() {
  const { currentPage, setCurrentPage, setPublishModalOpen, setAuthModal } = useUIStore();
  const { tasks } = useDownloadStore();
  const { isAuthenticated, user } = useAuthStore();
  const { getItemCount } = useCartStore();

  const activeDownloads = tasks.filter((t) => t.status === 'downloading').length;
  const cartCount = getItemCount();

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const items: NavItem[] = isAdmin
    ? [...navItems, { id: 'admin', icon: Shield, label: 'Админка' }]
    : navItems;

  return (
    <motion.aside
      initial={{ x: -64, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="fixed left-[10px] top-[42px] bottom-1.5 w-16 bg-background/90 backdrop-blur-xl border border-foreground/[0.06] rounded-2xl z-40 flex flex-col items-center py-4"
    >
      {/* Home */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={() => setCurrentPage('home')}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            aria-label="Главная"
            className={`${currentPage === 'home' ? 'sidebar-item-active' : 'sidebar-item'} group mb-6`}
          >
            <Home className="w-[18px] h-[18px] transition-all duration-200 group-hover:scale-125 group-hover:-rotate-[8deg]" />
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="right">Главная</TooltipContent>
      </Tooltip>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col items-center justify-center gap-1">
        {items.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <motion.button
                  onClick={() => setCurrentPage(item.id)}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                  aria-label={item.label}
                  className={`${isActive ? 'sidebar-item-active' : 'sidebar-item'} group`}
                >
                  <Icon className="w-[18px] h-[18px] transition-all duration-200 group-hover:scale-125 group-hover:-rotate-[8deg]" />
                  {item.id === 'downloads' && activeDownloads > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-zinc-500 text-[8px] font-bold text-foreground rounded-full flex items-center justify-center"
                    >
                      {activeDownloads}
                    </motion.span>
                  )}
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-1 pb-3">
        {/* Publish Button - Only for authenticated users */}
        {isAuthenticated && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => setPublishModalOpen(true)}
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                aria-label="Опубликовать мод"
                className="sidebar-item group text-zinc-500 hover:text-zinc-400 hover:bg-zinc-500/10"
              >
                <PlusCircle className="w-[18px] h-[18px] transition-all duration-200 group-hover:scale-125 group-hover:rotate-90" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="right">Опубликовать мод</TooltipContent>
          </Tooltip>
        )}

        {/* Cart */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              onClick={() => setCurrentPage('cart')}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              aria-label="Корзина"
              className={`${currentPage === 'cart' ? 'sidebar-item-active' : 'sidebar-item'} group relative`}
            >
              <Store className="w-[18px] h-[18px] transition-all duration-200 group-hover:scale-125 group-hover:-rotate-[8deg]" />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-zinc-500 text-[8px] font-bold text-foreground rounded-full flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right">Корзина</TooltipContent>
        </Tooltip>

        {/* User Avatar or Login */}
        {isAuthenticated ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => setCurrentPage('profile')}
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                aria-label="Профиль"
                className="sidebar-item group relative"
              >
                <div className="relative">
                  <UserAvatar
                    name={user?.displayName || user?.username}
                    src={user?.avatar}
                    className="w-7 h-7 text-[13px]"
                  />
                  {/* Balance badge removed — moved to Titlebar */}
                </div>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="right">{user?.displayName || 'Профиль'}</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                onClick={() => setAuthModal('login')}
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                aria-label="Войти"
                className="sidebar-item group"
              >
                <User className="w-[18px] h-[18px] transition-all duration-200 group-hover:scale-125" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="right">Войти</TooltipContent>
          </Tooltip>
        )}
      </div>
    </motion.aside>
  );
}
