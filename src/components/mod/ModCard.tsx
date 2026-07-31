import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Download, Star, CheckCircle, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Mod } from '@/types';
import { useModStore } from '@/store/modStore';
import { useFavoriteStore } from '@/store/favoriteStore';
import { projectLabels, tagColors } from '@/data/mock';

interface ModCardProps {
  mod: Mod;
  index: number;
}

export default function ModCard({ mod, index }: ModCardProps) {
  const { setSelectedMod, fetchModById, setDetailOpen } = useModStore();
  const { isFavorite, toggleFavorite } = useFavoriteStore();
  const favorited = isFavorite(mod.id);

  const gallery = mod.galleryImages?.length ? mod.galleryImages : [];
  const images = gallery.length ? gallery : (mod.coverImage ? [mod.coverImage] : []);
  const [activeImage, setActiveImage] = useState(0);

  // Reset to first image when switching mods
  useEffect(() => {
    setActiveImage(0);
  }, [mod.id]);

  const displayed = images[activeImage] || mod.coverImage;

  const step = (dir: number) => {
    if (images.length <= 1) return;
    setActiveImage((prev) => (prev + dir + images.length) % images.length);
  };

  const handleOpenDetail = () => {
    // Set list data immediately for instant modal display
    setSelectedMod(mod);
    setDetailOpen(true);
    // Then fetch full detail with gallery images
    fetchModById(mod.id);
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
      <div className="relative aspect-[16/9] overflow-hidden bg-foreground/[0.03]">
        {displayed ? (
          <img
            key={activeImage}
            src={displayed}
            alt={mod.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-zinc-600" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Gallery arrows on hover */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); step(-1); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/80 backdrop-blur-sm rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity z-[5]"
              title="Предыдущее изображение"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); step(1); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/80 backdrop-blur-sm rounded-full text-foreground opacity-0 group-hover:opacity-100 transition-opacity z-[5]"
              title="Следующее изображение"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded text-[9px] text-foreground/80 opacity-0 group-hover:opacity-100 transition-opacity">
              {activeImage + 1}/{images.length}
            </span>
          </>
        )}

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          <div className="flex flex-wrap gap-1">
            {mod.version && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-zinc-500/80 text-foreground">
                v{mod.version}
              </span>
            )}
            {mod.status === 'archived' && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-red-500/20 text-red-400 border border-red-500/30">
                Удалён
              </span>
            )}
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
              {mod.price} ₡
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
      <div className="relative p-2.5">
        {/* Redux Bio Image as background, dimmed so text stays readable */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/images/redux-bio.svg')" }}
        />
        <div className="absolute inset-0 bg-foreground/[0.03]" />

        <div className="relative">
          {/* Title */}
          <h3 className="text-[13px] font-semibold text-foreground truncate group-hover:text-zinc-400 transition-colors">
            {mod.title}
          </h3>

          {/* Author */}
          <div className="flex items-center gap-1.5 mt-1">
            <img
              src={mod.author.avatar}
              alt={mod.author.displayName}
              className="w-3.5 h-3.5 rounded-full bg-foreground/10"
            />
            <span className="text-[10px] text-zinc-400 truncate">
              {mod.author.displayName}
            </span>
            {mod.author.isVerified && (
              <CheckCircle className="w-2.5 h-2.5 text-zinc-400 flex-shrink-0" />
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-foreground/[0.06]">
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
      </div>
    </motion.div>
  );
}
