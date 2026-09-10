import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

export default function AuthModal() {
  const { authModal, setAuthModal } = useUIStore();
  const { telegramLogin } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  if (authModal === 'none') return null;

  const handleTelegramLogin = async () => {
    setIsLoading(true);
    try {
      await telegramLogin();
    } catch {
      toast.error('Не удалось инициализировать вход через Telegram');
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm glass-panel border border-foreground/[0.1] rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setAuthModal('none')}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-zinc-400 hover:text-foreground z-10"
          >
            <X className="w-4 h-4" />
          </Button>

          <div className="p-6">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-zinc-500 to-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-zinc-500/20">
                <span className="text-foreground font-bold text-2xl">C</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">
                Добро пожаловать
              </h2>
              <p className="text-sm text-zinc-500 mt-1.5">
                Войдите через Telegram, чтобы начать
              </p>
            </div>

            {/* Telegram Login Button */}
            <Button
              onClick={handleTelegramLogin}
              disabled={isLoading}
              className="w-full h-12 bg-[#0088cc] hover:bg-[#0088cc]/90 text-white text-base font-medium rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              )}
              {isLoading ? 'Авторизация...' : 'Войти через Telegram'}
            </Button>

            <p className="text-[11px] text-zinc-600 text-center mt-4">
              Нажимая кнопку, вы соглашаетесь с условиями использования
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
