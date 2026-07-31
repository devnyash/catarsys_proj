// Статичные превью-компоненты для модалки публикации мода.
// Зеркалят визуал ModCard.tsx (лента) и ModDetailModal.tsx (подробный просмотр),
// но без анимаций, кликов и зависимостей от store — чтобы не вызывать побочных эффектов.
import {
  Heart,
  Download,
  Star,
  CheckCircle,
  Image as ImageIcon,
  HardDrive,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { categoryLabels, projectLabels } from '@/data/mock';
import type { ModCategory, ModProject } from '@/types';

export interface ModDraft {
  title: string;
  description: string;
  version: string;
  price: number;
  category: ModCategory;
  project: ModProject;
  isDangerous: boolean;
  coverImage: string | null;
  galleryImages: string[];
  tags: string[];
  author: { displayName: string; avatar: string; isVerified: boolean };
  downloadsCount: number;
  rating: number;
  reviewsCount: number;
  fileSize: string;
}

// Аватар: пустая строка (неавторизованный автор) → буква вместо сломанной картинки.
function Avatar({ name, avatar, size }: { name: string; avatar: string; size: string }) {
  if (avatar) {
    return <img src={avatar} alt={name} className={`${size} rounded-full bg-foreground/10`} />;
  }
  return (
    <div className={`${size} rounded-full bg-zinc-500/60 text-foreground flex items-center justify-center font-semibold`}>
      {(name.charAt(0) || '?').toUpperCase()}
    </div>
  );
}

/** Превью карточки мода как в ленте (копия структуры ModCard.tsx). */
export function ModCardPreview({ draft }: { draft: ModDraft }) {
  const image = draft.coverImage || draft.galleryImages[0];

  return (
    <div className="group glass-card-hover cursor-default overflow-hidden">
      {/* Image Container */}
      <div className="relative aspect-[16/9] overflow-hidden bg-foreground/[0.03]">
        {image ? (
          <img src={image} alt={draft.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-zinc-600" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          <div className="flex flex-wrap gap-1">
            {draft.version && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-zinc-500/80 text-foreground">
                v{draft.version}
              </span>
            )}
            {draft.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-foreground/10 text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            type="button"
            className="p-1.5 rounded-full backdrop-blur-sm bg-black/40 text-zinc-300 cursor-default"
          >
            <Heart className="w-3 h-3" />
          </button>
        </div>

        {/* Price Badge */}
        <div className="absolute bottom-2 right-2">
          {draft.price === 0 ? (
            <span className="px-2 py-0.5 bg-zinc-500/80 text-foreground text-[10px] font-bold rounded backdrop-blur-sm">
              Бесплатно
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-zinc-500/80 text-foreground text-[10px] font-bold rounded backdrop-blur-sm">
              {draft.price} ₡
            </span>
          )}
        </div>

        {/* Danger Badge */}
        {draft.isDangerous && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2">
            <span className="px-1.5 py-0.5 bg-zinc-500/80 text-foreground text-[8px] font-bold rounded backdrop-blur-sm">
              ⚠ Опасно
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative p-2.5">
        <div className="absolute inset-0 mod-card-bg" />
        <div className="absolute inset-0 bg-foreground/[0.03]" />

        <div className="relative">
          <h3 className="text-[13px] font-semibold text-foreground truncate">
            {draft.title || 'Название мода'}
          </h3>

          <div className="flex items-center gap-1.5 mt-1">
            <Avatar name={draft.author.displayName} avatar={draft.author.avatar} size="w-3.5 h-3.5" />
            <span className="text-[10px] text-zinc-400 truncate">
              {draft.author.displayName}
            </span>
            {draft.author.isVerified && (
              <CheckCircle className="w-2.5 h-2.5 text-zinc-400 flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-foreground/[0.06]">
            <div className="flex items-center gap-1">
              <Download className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] text-zinc-400">
                {draft.downloadsCount >= 1000
                  ? `${(draft.downloadsCount / 1000).toFixed(1)}k`
                  : draft.downloadsCount}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-zinc-400 fill-zinc-400" />
              <span className="text-[10px] text-zinc-400">{draft.rating}</span>
            </div>
            <span className="text-[9px] text-zinc-500 ml-auto px-1.5 py-0.5 bg-foreground/[0.04] rounded">
              {projectLabels[draft.project]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Превью подробного просмотра мода (компактная копия структуры ModDetailModal.tsx). */
export function ModDetailPreview({ draft }: { draft: ModDraft }) {
  const image = draft.coverImage || draft.galleryImages[0];

  return (
    <div className="glass-panel border border-foreground/[0.1] rounded-xl overflow-hidden shadow-2xl shadow-black/40">
      {/* Image */}
      <div className="relative aspect-video bg-foreground/[0.03]">
        {image ? (
          <img src={image} alt={draft.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-zinc-600" />
          </div>
        )}
      </div>

      <div className="p-3">
        {/* Header */}
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground truncate">
            {draft.title || 'Название мода'}
          </h2>
          <div className="flex items-center gap-1.5 mt-1">
            <Avatar name={draft.author.displayName} avatar={draft.author.avatar} size="w-4 h-4" />
            <span className="text-[10px] text-zinc-400 truncate">
              от {draft.author.displayName}
            </span>
            {draft.author.isVerified && (
              <CheckCircle className="w-3 h-3 text-zinc-400 flex-shrink-0" />
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <div className="bg-foreground/[0.03] rounded-md p-1.5 text-center">
            <HardDrive className="w-3 h-3 text-zinc-500 mx-auto mb-0.5" />
            <span className="text-[8px] text-zinc-400 block">Размер</span>
            <p className="text-[10px] font-semibold text-foreground">{draft.fileSize}</p>
          </div>
          <div className="bg-foreground/[0.03] rounded-md p-1.5 text-center">
            <Tag className="w-3 h-3 text-zinc-500 mx-auto mb-0.5" />
            <span className="text-[8px] text-zinc-400 block">Версия</span>
            <p className="text-[10px] font-semibold text-foreground">{draft.version || '—'}</p>
          </div>
          <div className="bg-foreground/[0.03] rounded-md p-1.5 text-center">
            <Download className="w-3 h-3 text-zinc-500 mx-auto mb-0.5" />
            <span className="text-[8px] text-zinc-400 block">Загрузки</span>
            <p className="text-[10px] font-semibold text-foreground">
              {draft.downloadsCount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1.5 mt-2">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-3 h-3 ${
                  star <= Math.round(draft.rating)
                    ? 'text-zinc-400 fill-zinc-400'
                    : 'text-zinc-600'
                }`}
              />
            ))}
          </div>
          <span className="text-[10px] text-zinc-400">
            {draft.rating} ({draft.reviewsCount} отзывов)
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="px-1.5 py-0.5 bg-foreground/[0.05] text-zinc-400 text-[9px] rounded">
            {categoryLabels[draft.category]}
          </span>
          <span className="px-1.5 py-0.5 bg-foreground/[0.05] text-zinc-400 text-[9px] rounded">
            {projectLabels[draft.project]}
          </span>
          {draft.isDangerous && (
            <span className="px-1.5 py-0.5 bg-zinc-500/10 text-zinc-400 text-[9px] rounded flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5" />
              Опасно
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-[10px] text-zinc-400 leading-relaxed mt-2 line-clamp-4">
          {draft.description || 'Описание мода появится здесь...'}
        </p>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-foreground/[0.06] bg-foreground/[0.02]">
        <button
          type="button"
          className="w-full btn-primary flex items-center justify-center gap-1.5 py-2 text-xs cursor-default"
        >
          <Download className="w-3.5 h-3.5" />
          {draft.price === 0 ? 'Скачать бесплатно' : `Купить ${draft.price} ₡`}
        </button>
      </div>
    </div>
  );
}
