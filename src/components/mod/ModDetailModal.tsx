import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Heart,
  ShoppingCart,
  Star,
  CheckCircle,
  HardDrive,
  Tag,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useModStore } from '@/store/modStore';
import { useFavoriteStore } from '@/store/favoriteStore';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useDownloadStore } from '@/store/downloadStore';
import { categoryLabels, projectLabels, mockReviews } from '@/data/mock';
import toast from 'react-hot-toast';

export default function ModDetailModal() {
  const { selectedMod, isDetailOpen, setDetailOpen } = useModStore();
  const { isFavorite, toggleFavorite } = useFavoriteStore();
  const { isInCart, addItem, removeItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { addTask } = useDownloadStore();

  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'desc' | 'changelog' | 'reviews'>('desc');

  if (!selectedMod || !isDetailOpen) return null;

  const favorited = isFavorite(selectedMod.id);
  const inCart = isInCart(selectedMod.id);
  const modReviews = mockReviews.filter((r) => r.modId === selectedMod.id);

  const handleDownload = () => {
    if (!isAuthenticated) {
      toast.error('Пожалуйста, войдите чтобы скачать');
      return;
    }
    toast.success(`Начинаем загрузку: ${selectedMod.title}`);
    addTask({
      modId: selectedMod.id,
      modTitle: selectedMod.title,
      progress: 0,
      status: 'downloading',
      speed: '15.2 MB/s',
      totalSize: selectedMod.fileSize,
      downloadedSize: '0 MB',
    });
  };

  const nextImage = () => {
    setActiveImage((prev) => (prev + 1) % selectedMod.galleryImages.length);
  };

  const prevImage = () => {
    setActiveImage(
      (prev) =>
        (prev - 1 + selectedMod.galleryImages.length) %
        selectedMod.galleryImages.length
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={() => setDetailOpen(false)}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Modal */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[90vh] bg-card border border-foreground/[0.1] rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={() => setDetailOpen(false)}
            className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-zinc-400 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col lg:flex-row h-full max-h-[90vh]">
            {/* Left - Image Gallery */}
            <div className="lg:w-[55%] flex-shrink-0">
              <div className="relative aspect-video lg:aspect-auto lg:h-72">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={activeImage}
                    src={selectedMod.galleryImages[activeImage]}
                    alt={selectedMod.title}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full object-cover"
                  />
                </AnimatePresence>

                {selectedMod.galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-foreground transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {selectedMod.galleryImages.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {selectedMod.galleryImages.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`flex-shrink-0 w-16 h-10 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === activeImage
                          ? 'border-zinc-500'
                          : 'border-transparent hover:border-foreground/30'
                      }`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right - Info */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">
                      {selectedMod.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <img
                        src={selectedMod.author.avatar}
                        alt={selectedMod.author.displayName}
                        className="w-5 h-5 rounded-full bg-foreground/10"
                      />
                      <span className="text-xs text-zinc-400">
                        от {selectedMod.author.displayName}
                      </span>
                      {selectedMod.author.isVerified && (
                        <CheckCircle className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-foreground/[0.03] rounded-lg p-2.5 text-center">
                    <HardDrive className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
                    <span className="text-[10px] text-zinc-400">Размер</span>
                    <p className="text-xs font-semibold text-foreground">
                      {selectedMod.fileSize}
                    </p>
                  </div>
                  <div className="bg-foreground/[0.03] rounded-lg p-2.5 text-center">
                    <Tag className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
                    <span className="text-[10px] text-zinc-400">Версия</span>
                    <p className="text-xs font-semibold text-foreground">
                      {selectedMod.version}
                    </p>
                  </div>
                  <div className="bg-foreground/[0.03] rounded-lg p-2.5 text-center">
                    <Download className="w-4 h-4 text-zinc-500 mx-auto mb-1" />
                    <span className="text-[10px] text-zinc-400">Загрузки</span>
                    <p className="text-xs font-semibold text-foreground">
                      {selectedMod.downloadsCount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= Math.round(selectedMod.rating)
                            ? 'text-zinc-400 fill-zinc-400'
                            : 'text-zinc-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-zinc-400">
                    {selectedMod.rating} ({selectedMod.reviewsCount} отзывов)
                  </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span className="px-2 py-0.5 bg-foreground/[0.05] text-zinc-400 text-[10px] rounded">
                    {categoryLabels[selectedMod.category]}
                  </span>
                  <span className="px-2 py-0.5 bg-foreground/[0.05] text-zinc-400 text-[10px] rounded">
                    {projectLabels[selectedMod.project]}
                  </span>
                  {selectedMod.isDangerous && (
                    <span className="px-2 py-0.5 bg-zinc-500/10 text-zinc-400 text-[10px] rounded flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Опасно
                    </span>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-4 bg-foreground/[0.03] rounded-lg p-1">
                  {[
                    { id: 'desc' as const, label: 'Описание' },
                    { id: 'changelog' as const, label: 'Список изменений' },
                    { id: 'reviews' as const, label: `Отзывы (${modReviews.length})` },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 py-1.5 text-[11px] font-medium rounded-md transition-colors ${
                        activeTab === tab.id
                          ? 'bg-foreground/10 text-foreground'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="mt-3 min-h-[120px]">
                  {activeTab === 'desc' && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-zinc-400 leading-relaxed"
                    >
                      {selectedMod.description}
                    </motion.p>
                  )}

                  {activeTab === 'changelog' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-zinc-400 space-y-2"
                    >
                      <p className="font-semibold text-zinc-300">
                        Версия {selectedMod.version}
                      </p>
                      <ul className="space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-zinc-400 mt-0.5">+</span>
                          Улучшена производительность и оптимизация
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-zinc-400 mt-0.5">+</span>
                          Добавлены новые функции и эффекты
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-zinc-400 mt-0.5">-</span>
                          Исправлены проблемы совместимости
                        </li>
                      </ul>
                    </motion.div>
                  )}

                  {activeTab === 'reviews' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-3"
                    >
                      {modReviews.length > 0 ? (
                        modReviews.map((review) => (
                          <div
                            key={review.id}
                            className="bg-foreground/[0.03] rounded-lg p-3"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src={review.user.avatar}
                                alt={review.user.displayName}
                                className="w-5 h-5 rounded-full"
                              />
                              <span className="text-xs font-medium text-foreground">
                                {review.user.displayName}
                              </span>
                              <div className="flex ml-auto">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3 h-3 ${
                                      star <= review.score
                                        ? 'text-zinc-400 fill-zinc-400'
                                        : 'text-zinc-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1.5">
                              {review.comment}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-zinc-500 text-center py-4">
                          Отзывов пока нет. Будьте первым!
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 border-t border-foreground/[0.06] bg-card">
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 py-2.5"
                  >
                    <Download className="w-4 h-4" />
                    {selectedMod.price === 0 ? 'Скачать бесплатно' : `Купить ${selectedMod.price} ₽`}
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(selectedMod.id);
                    }}
                    className={`p-2.5 rounded-md border transition-colors ${
                      favorited
                        ? 'bg-zinc-500/20 border-zinc-500/40 text-zinc-400'
                        : 'border-foreground/20 text-zinc-400 hover:bg-foreground/5 hover:text-foreground'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${favorited ? 'fill-current' : ''}`}
                    />
                  </button>

                  {selectedMod.price > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (inCart) {
                          removeItem(selectedMod.id);
                          toast.success('Удалено из корзины');
                        } else {
                          addItem(selectedMod);
                          toast.success('Добавлено в корзину');
                        }
                      }}
                      className={`p-2.5 rounded-md border transition-colors ${
                        inCart
                          ? 'bg-zinc-500/20 border-zinc-500/40 text-zinc-400'
                          : 'border-foreground/20 text-zinc-400 hover:bg-foreground/5 hover:text-foreground'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
