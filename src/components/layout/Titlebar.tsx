import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Minus,
  Square,
  Minimize2,
  X,
  Download,
  Command,
  CheckCheck,
  ShoppingBag,
  Percent,
  CheckCircle,
  Wallet,
  Sparkles,
  Moon,
  Sun,
} from 'lucide-react';
import { useThemeStore } from '@/store/themeStore';
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
  const { resolved, toggleTheme } = useThemeStore();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotificationStore();
  const { tasks } = useDownloadStore();

  const [showNotifs, setShowNotifs] = useState(false);
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

  const activeDownloads = tasks.filter((t) => t.status === 'downloading').length;
  const totalProgress =
    tasks.length > 0
      ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)
      : 0;

  const handleMinimize = () => { try { (window as any).pywebview?.api?.minimize_window(); } catch {} };
  const [isMaximized, setIsMaximized] = useState(false);
  const handleMaximize = useCallback(() => {
    try {
      (window as any).pywebview?.api?.maximize_window().then((r: any) => {
        if (typeof r === 'boolean') setIsMaximized(r);
        else setIsMaximized((p) => !p);
      }).catch(() => setIsMaximized((p) => !p));
    } catch { setIsMaximized((p) => !p); }
  }, []);
  const handleClose = () => { try { (window as any).pywebview?.api?.close_window(); } catch {} };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pywebview-drag-region fixed top-0 left-0 right-0 h-[38px] glass-panel border-b-0 z-50 flex items-center justify-between px-3 select-none"
    >
      {/* Left Section */}
      <div className="flex items-center gap-2">
        <Command className="w-4 h-4 text-zinc-500" />
        <span className="font-bold text-[11px] tracking-tight">Catarsys</span>
        <motion.button
          onClick={() => setShowChangelog(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="text-[9px] text-zinc-500 bg-foreground/10 px-1 py-px rounded cursor-pointer hover:text-zinc-400 transition-colors"
        >
          v1.3.0
        </motion.button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1">

        {/* Theme toggle */}
        <motion.button
          onClick={toggleTheme}
          whileHover={{ scale: 1.15, rotate: 15 }}
          whileTap={{ scale: 0.85 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          title={resolved === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          aria-label="Переключить тему"
          className="p-1 text-zinc-400 hover:text-foreground hover:bg-foreground/5 rounded-md transition-colors"
        >
          {resolved === 'dark' ? (
            <Sun className="w-3.5 h-3.5" />
          ) : (
            <Moon className="w-3.5 h-3.5" />
          )}
        </motion.button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <motion.button
            onClick={() => setShowNotifs(!showNotifs)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="relative p-1 text-zinc-400 hover:text-foreground hover:bg-foreground/5 rounded-md transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-zinc-500 text-[7px] font-bold text-foreground rounded-full flex items-center justify-center"
              >
                {unreadCount}
              </motion.span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-10 w-80 glass-card bg-card shadow-xl shadow-black/50 z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-foreground/[0.06]">
                  <span className="text-xs font-semibold text-foreground">Уведомления</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-300 transition-colors"
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
                          className={`w-full px-3 py-2.5 text-left flex items-start gap-3 transition-colors hover:bg-foreground/[0.03] ${
                            !notif.isRead ? 'bg-foreground/[0.02]' : ''
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              !notif.isRead
                                ? 'bg-zinc-500/10 text-zinc-400'
                                : 'bg-foreground/[0.05] text-zinc-500'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-xs ${!notif.isRead ? 'text-foreground font-medium' : 'text-zinc-300'}`}>
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
                            <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full flex-shrink-0 mt-1.5" />
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

        {/* Download Progress */}
        {activeDownloads > 0 && (
          <motion.button
            onClick={() => useDownloadStore.getState().toggleExpanded()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1 px-1.5 py-0.5 bg-foreground/10 hover:bg-foreground/15 rounded-md transition-colors"
          >
            <Download className="w-3 h-3 text-zinc-400" />
            <span className="text-[9px] text-zinc-300">{totalProgress}%</span>
          </motion.button>
        )}

        {/* Window Controls */}
        <div className="flex items-center ml-1.5 border-l border-foreground/10 pl-1.5">
          <motion.button
            onClick={handleMinimize}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            className="p-1 text-zinc-500 hover:text-foreground hover:bg-foreground/5 rounded transition-colors"
          >
            <Minus className="w-3 h-3" />
          </motion.button>
          <motion.button
            onClick={handleMaximize}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            className="p-1 text-zinc-500 hover:text-foreground hover:bg-foreground/5 rounded transition-colors"
          >
            {isMaximized ? <Minimize2 className="w-2.5 h-2.5" /> : <Square className="w-2.5 h-2.5" />}
          </motion.button>
          <motion.button
            onClick={handleClose}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            className="p-1 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-500/10 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Changelog Modal (portal to body so it covers the whole window, not just the navbar) */}
      {createPortal(
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
              className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-foreground/[0.1] rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowChangelog(false)}
                className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-zinc-400 hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="p-6 overflow-y-auto max-h-[90vh] scrollbar-thin">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-zinc-500 to-zinc-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-zinc-500/20">
                    <Command className="w-5 h-5 text-foreground" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">Changelog v1.3.0</h2>
                  <p className="text-xs text-zinc-500 mt-1">Последние обновления Catarsys</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Новое</h3>
                    <ul className="space-y-2 text-xs text-zinc-400">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Улучшен интерфейс настроек с поддержкой live-изменений</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Исправлены кнопки навигации в шапке: Обзор, Мои моды, Плагины</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Добавлена кнопка редактирования профиля</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Исправлена статистика профиля (реальные данные загрузок, покупок, рейтинга)</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Исправлено</h3>
                    <ul className="space-y-2 text-xs text-zinc-400">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Кнопка версии теперь кликабельна и открывает модалку с чейнжлогами</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Убрано поле поиска из шапки (оно есть на главной странице)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Убрана кнопка добавления мода для неавторизованных пользователей</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Известные проблемы</h3>
                    <ul className="space-y-2 text-xs text-zinc-500">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full mt-1.5 flex-shrink-0" />
                        <span>Выбор папки загрузок пока работает только через ручной ввод</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-foreground/[0.06]">
                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                      <Command className="w-3 h-3 text-zinc-500" />
                      <span>Catarsys v1.3.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </motion.header>
  );
}
