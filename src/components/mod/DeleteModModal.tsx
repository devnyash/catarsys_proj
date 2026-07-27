import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Archive, Trash2, Loader2 } from 'lucide-react';
import { modsApi } from '@/api/mods';
import toast from 'react-hot-toast';

interface DeleteModModalProps {
  modId: number;
  modTitle: string;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteModModal({ modId, modTitle, open, onClose, onDeleted }: DeleteModModalProps) {
  const [loading, setLoading] = useState<'archive' | 'full' | null>(null);

  const handleDelete = async (mode: 'archive' | 'full') => {
    setLoading(mode);
    try {
      await modsApi.delete(modId, mode as 'soft' | 'full' | 'archive');
      if (mode === 'archive') {
        toast.success('Мод архивирован');
      } else {
        toast.success('Мод полностью удалён');
      }
      onDeleted();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка при удалении');
    } finally {
      setLoading(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md glass-panel rounded-2xl border border-foreground/10 p-6 relative"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-foreground hover:bg-foreground/5 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Удалить мод</h2>
                <p className="text-sm text-zinc-500 truncate max-w-[300px]">{modTitle}</p>
              </div>
            </div>

            <p className="text-sm text-zinc-400 mb-5">
              Выберите способ удаления:
            </p>

            <div className="space-y-3">
              <button
                onClick={() => handleDelete('archive')}
                disabled={loading !== null}
                className="w-full flex items-center gap-3 p-4 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 rounded-xl transition-colors disabled:opacity-50"
              >
                <Archive className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-foreground">Архивировать</p>
                  <p className="text-xs text-zinc-500">
                    Мод останется на площадке с бейджем "Удалён".
                    Его нельзя будет купить или скачать, но информация будет видна.
                  </p>
                </div>
                {loading === 'archive' && <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />}
              </button>

              <button
                onClick={() => handleDelete('full')}
                disabled={loading !== null}
                className="w-full flex items-center gap-3 p-4 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-xl transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-foreground">Полное удаление</p>
                  <p className="text-xs text-zinc-500">
                    Мод удаляется с площадки полностью и безвозвратно.
                  </p>
                </div>
                {loading === 'full' && <Loader2 className="w-4 h-4 text-red-400 animate-spin flex-shrink-0" />}
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-4 px-4 py-2 bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 rounded-lg text-sm text-zinc-300 hover:text-foreground transition-colors"
            >
              Отмена
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}