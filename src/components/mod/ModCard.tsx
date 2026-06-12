import { motion } from 'framer-motion';
import { Heart, Download, Star, CheckCircle } from 'lucide-react';
import type { Mod } from '@/types';
import { useModStore } from '@/store/modStore';
import { useFavoriteStore } from '@/store/favoriteStore';
import { projectLabels, tagColors } from '@/data/mock';

interface ModCardProps {
  mod: Mod;
  index: number;
}

export default function ModCard({ mod, index }: ModCardProps) {
  const { setSelectedMod, setDetailOpen } = useModStore();
  const { isFavorite, toggleFavorite } = useFavoriteStore();
  const favorited = isFavorite(mod.id);

  const handleOpenDetail = () => {
    setSelectedMod(mod);
    setDetailOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: index * 0.06,
        ease: [0.23, 1, 0.32, 1],
      }}
      className="group glass-card-hover cursor-pointer overflow-hidden"
      onClick={handleOpenDetail}
    >
      {/* Image Container */}
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={mod.coverImage}
          alt={mod.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          <div className="flex flex-wrap gap-1">
            {mod.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded ${
                  tagColors[tag] || 'bg-foreground/10 text-zinc-300'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(mod.id);
            }}
            className={`p-1.5 rounded-full backdrop-blur-sm transition-all duration-200 ${
              favorited
                ? 'bg-zinc-500/80 text-foreground'
                : 'bg-black/40 text-zinc-300 hover:bg-black/60 hover:text-foreground'
            }`}
          >
            <Heart className={`w-3 h-3 ${favorited ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-2 right-2">
          {mod.price === 0 ? (
            <span className="px-2 py-0.5 bg-zinc-500/80 text-foreground text-[10px] font-bold rounded backdrop-blur-sm">
              Бесплатно
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-zinc-500/80 text-foreground text-[10px] font-bold rounded backdrop-blur-sm">
              {mod.price} ₽
            </span>
          )}
        </div>

        {/* Danger Badge */}
        {mod.isDangerous && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <span className="px-1.5 py-0.5 bg-zinc-500/80 text-foreground text-[8px] font-bold rounded backdrop-blur-sm">
              ⚠ Опасно
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-zinc-400 transition-colors">
          {mod.title}
        </h3>

        {/* Author */}
        <div className="flex items-center gap-1.5 mt-1">
          <img
            src={mod.author.avatar}
            alt={mod.author.displayName}
            className="w-4 h-4 rounded-full bg-foreground/10"
          />
          <span className="text-[11px] text-zinc-400 truncate">
            {mod.author.displayName}
          </span>
          {mod.author.isVerified && (
            <CheckCircle className="w-3 h-3 text-zinc-400 flex-shrink-0" />
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-foreground/[0.06]">
          <div className="flex items-center gap-1">
            <Download className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-400">
              {mod.downloadsCount >= 1000
                ? `${(mod.downloadsCount / 1000).toFixed(1)}k`
                : mod.downloadsCount}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-zinc-400 fill-zinc-400" />
            <span className="text-[10px] text-zinc-400">{mod.rating}</span>
          </div>
          <span className="text-[9px] text-zinc-500 ml-auto px-1.5 py-0.5 bg-foreground/[0.04] rounded">
            {projectLabels[mod.project]}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
