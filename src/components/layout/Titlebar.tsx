import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  ShoppingCart,
  Minus,
  Square,
  X,
  User,
  Download,
  Command,
  CheckCheck,

  ShoppingBag,
  Percent,
  CheckCircle,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useCartStore } from '@/store/cartStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useDownloadStore } from '@/store/downloadStore';

const notifIcons: Record<string, typeof Bell> = {
  purchase_success: ShoppingBag,
  discount_started: Percent,
  mod_approved: CheckCircle,
  balance_changed: Wallet,
  new_mod: Sparkles,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins}м назад`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}ч назад`;
  const days = Math.floor(hrs / 24);
  return `${days}д назад`;
}

export default function Titlebar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { setAuthModal, setCurrentPage } = useUIStore();
  const { getItemCount } = useCartStore();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotificationStore();
  const { tasks } = useDownloadStore();

  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    if (showNotifs) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifs]);

  const cartCount = getItemCount();
  const activeDownloads = tasks.filter((t) => t.status === 'downloading').length;
  const totalProgress =
    tasks.length > 0
      ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)
      : 0;

  const handleMinimize = () => { try { (window as any).pywebview?.api?.minimize_window(); } catch {} };
  const handleMaximize = () => { try { (window as any).pywebview?.api?.toggle_maximize(); } catch {} };
  const handleClose = () => { try { (window as any).pywebview?.api?.close_window(); } catch {} };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pywebview-drag-region fixed top-0 left-16 right-0 h-[50px] glass-panel z-50 flex items-center justify-between px-4 select-none"
    >
      {/* Left Section */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Command className="w-5 h-5 text-rose-500" />
          <span className="font-bold text-sm tracking-tight">Catarsys</span>
          <button
            onClick={() => setShowChangelog(true)}
            className="text-[10px] text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded cursor-pointer hover:text-zinc-400 transition-colors"
          >
            v1.3.0
          </button>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {['Обзор', 'Мои моды', 'Плагины'].map((item) => (
            <button
              key={item}
              onClick={() => {
                if (item === 'Обзор') setCurrentPage('home');
                else if (item === 'Мои моды') setCurrentPage('profile');
                else if (item === 'Плагины') setCurrentPage('favorites');
              }}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white rounded-md hover:bg-white/5 transition-colors"
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">

        {/* Balance */}
        {isAuthenticated && user && (
          <button
            onClick={() => setCurrentPage('credits')}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/60 hover:bg-zinc-800 rounded-md transition-colors"
          >
            <span className="text-xs font-semibold text-white">{user.balance.toLocaleString()} ₽</span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-[9px] font-bold text-white rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 w-80 glass-card bg-[#1A1A1E] shadow-xl shadow-black/50 z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
                  <span className="text-xs font-semibold text-white">Уведомления</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      <CheckCheck className="w-3 h-3" />
                      Прочитать все
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto scrollbar-thin">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => {
                      const Icon = notifIcons[notif.type] || Bell;
                      return (
                        <button
                          key={notif.id}
                          onClick={() => markAsRead(notif.id)}
                          className={`w-full px-3 py-2.5 text-left flex items-start gap-3 transition-colors hover:bg-white/[0.03] ${
                            !notif.isRead ? 'bg-white/[0.02]' : ''
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              !notif.isRead
                                ? 'bg-rose-500/10 text-rose-400'
                                : 'bg-white/[0.05] text-zinc-500'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-xs ${!notif.isRead ? 'text-white font-medium' : 'text-zinc-300'}`}>
                                {notif.title}
                              </p>
                              <span className="text-[10px] text-zinc-600 flex-shrink-0">
                                {timeAgo(notif.createdAt)}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                          </div>
                          {!notif.isRead && (
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center">
                      <Bell className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                      <p className="text-xs text-zinc-500">Нет уведомлений</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cart */}
        <button
          onClick={() => setCurrentPage('cart')}
          className="relative p-1.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
        >
          <ShoppingCart className="w-4 h-4" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-[9px] font-bold text-white rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>

        {/* Download Progress */}
        {activeDownloads > 0 && (
          <button
            onClick={() => useDownloadStore.getState().toggleExpanded()}
            className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/60 hover:bg-zinc-800 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-zinc-300">{totalProgress}%</span>
          </button>
        )}

        {/* User */}
        {isAuthenticated ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 px-1.5 py-1 hover:bg-white/5 rounded-md transition-colors"
            >
              <img
                src={user?.avatar}
                alt={user?.displayName}
                className="w-6 h-6 rounded-full bg-zinc-700"
              />
              <span className="text-xs text-zinc-300 hidden lg:block">{user?.displayName}</span>
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 w-48 glass-card bg-[#1A1A1E] shadow-xl shadow-black/50 z-50 py-1"
                >
                  <button
                    onClick={() => {
                      setCurrentPage('profile');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5" />
                    Профиль
                  </button>
                  <button
                    onClick={() => {
                      setCurrentPage('settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Command className="w-3.5 h-3.5" />
                    Настройки
                  </button>
                  <div className="border-t border-white/10 my-1" />
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    Выйти
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={() => setAuthModal('login')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-md transition-colors"
          >
            Войти
          </button>
        )}

        {/* Window Controls */}
        <div className="flex items-center ml-2 border-l border-white/10 pl-2">
          <button
            onClick={handleMinimize}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleMaximize}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded transition-colors"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Changelog Modal */}
      <AnimatePresence>
        {showChangelog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            onClick={() => setShowChangelog(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl max-h-[90vh] bg-[#1A1A1E] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowChangelog(false)}
                className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-6 overflow-y-auto max-h-[90vh] scrollbar-thin">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/20">
                    <Command className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Changelog v1.3.0</h2>
                  <p className="text-xs text-zinc-500 mt-1">Последние обновления Catarsys</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">Новое</h3>
                    <ul className="space-y-2 text-xs text-zinc-400">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Улучшен интерфейс настроек с поддержкой live-изменений</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Исправлены кнопки навигации в шапке: Обзор, Мои моды, Плагины</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Добавлена кнопка редактирования профиля</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Исправлена статистика профиля (реальные данные загрузок, покупок, рейтинга)</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">Исправлено</h3>
                    <ul className="space-y-2 text-xs text-zinc-400">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Кнопка версии теперь кликабельна и открывает модалку с чейнжлогами</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Убрано поле поиска из шапки (оно есть на главной странице)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-sky-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Убрана кнопка добавления мода для неавторизованных пользователей</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">Известные проблемы</h3>
                    <ul className="space-y-2 text-xs text-zinc-500">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Выбор папки загрузок пока работает только через ручной ввод</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-white/[0.06]">
                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                      <Command className="w-3 h-3 text-rose-500" />
                      <span>Catarsys v1.3.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
