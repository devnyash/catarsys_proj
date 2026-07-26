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
      <motion.button
        onClick={() => setCurrentPage('home')}
        whileTap={{ scale: 0.88 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className={`${currentPage === 'home' ? 'sidebar-item-active' : 'sidebar-item'} group mb-6`}
        title="Главная"
      >
        <Home
          className="w-[18px] h-[18px] transition-all duration-200 group-hover:scale-125 group-hover:-rotate-[8deg]"
          fill={currentPage === 'home' ? 'currentColor' : 'none'}
        />
      </motion.button>

      {/* Nav Items */}
      <nav className="flex-1 flex flex-col items-center justify-center gap-1">
        {items.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              whileTap={{ scale: 0.88 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              className={`${isActive ? 'sidebar-item-active' : 'sidebar-item'} group`}
              title={item.label}
            >
              <Icon
                className="w-[18px] h-[18px] transition-all duration-200 group-hover:scale-125 group-hover:-rotate-[8deg]"
                fill={isActive ? 'currentColor' : 'none'}
              />
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
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-1 pb-3">
        {/* Publish Button - Only for authenticated users */}
        {isAuthenticated && (
          <motion.button
            onClick={() => setPublishModalOpen(true)}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="sidebar-item group text-zinc-500 hover:text-zinc-400 hover:bg-zinc-500/10"
            title="Опубликовать мод"
          >
            <PlusCircle className="w-[18px] h-[18px] transition-all duration-200 group-hover:scale-125 group-hover:rotate-90" />
          </motion.button>
        )}

        {/* Cart */}
        <motion.button
          onClick={() => setCurrentPage('cart')}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className={`${currentPage === 'cart' ? 'sidebar-item-active' : 'sidebar-item'} group relative`}
          title="Корзина"
        >
          <Store
            className="w-[18px] h-[18px] transition-all duration-200 group-hover:scale-125 group-hover:-rotate-[8deg]"
            fill={currentPage === 'cart' ? 'currentColor' : 'none'}
          />
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

        {/* User Avatar or Login */}
        {isAuthenticated ? (
          <motion.button
            onClick={() => setCurrentPage('profile')}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="sidebar-item group relative"
            title={user?.displayName || 'Профиль'}
          >
            <div className="relative">
              <UserAvatar
                name={user?.displayName || user?.username}
                src={user?.avatar}
                className="w-[22px] h-[22px] text-[10px]"
              />
              {/* Balance badge */}
              {user && user.balance > 0 && (
                <span
                  className="absolute -bottom-1.5 -right-1.5 bg-zinc-600 text-foreground text-[6px] font-bold rounded-full px-1 py-[1px] leading-none border-2 border-background"
                  title={`Баланс: ${user.balance.toLocaleString()} ₡`}
                >
                  ₡
                </span>
              )}
            </div>
          </motion.button>
        ) : (
          <motion.button
            onClick={() => setAuthModal('login')}
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="sidebar-item group"
            title="Войти"
          >
            <User
              className="w-[18px] h-[18px] transition-all duration-200 group-hover:scale-125"
              fill={currentPage === 'profile' ? 'currentColor' : 'none'}
            />
          </motion.button>
        )}
      </div>
    </motion.aside>
  );
}
