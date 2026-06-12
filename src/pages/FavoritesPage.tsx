import { motion } from 'framer-motion';
import { Heart, ArrowRight } from 'lucide-react';
import { useFavoriteStore } from '@/store/favoriteStore';
import { useModStore } from '@/store/modStore';
import { useUIStore } from '@/store/uiStore';
import ModCard from '@/components/mod/ModCard';

export default function FavoritesPage() {
  const { favorites } = useFavoriteStore();
  const { mods } = useModStore();
  const { setCurrentPage } = useUIStore();

  const favoriteMods = mods.filter((m) => favorites.includes(m.id));

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-foreground mb-1">Избранное</h1>
        <p className="text-sm text-zinc-500">
          {favoriteMods.length} {favoriteMods.length === 1 ? 'мод' : favoriteMods.length < 5 ? 'мода' : 'модов'} в вашей коллекции
        </p>
      </motion.div>

      {favoriteMods.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {favoriteMods.map((mod, i) => (
            <ModCard key={mod.id} mod={mod} index={i} />
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <Heart className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-400 mb-1">
            Нет избранного
          </h3>
          <p className="text-sm text-zinc-600 mb-4">
            Просматривайте моды и добавляйте их в избранное
          </p>
          <button
            onClick={() => setCurrentPage('home')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-foreground hover:bg-foreground/90 text-background text-sm font-medium rounded-lg transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            Просмотреть моды
          </button>
        </motion.div>
      )}
    </div>
  );
}
