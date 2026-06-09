import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Image,
  AlertTriangle,
  Users,
  Send,
  Link,
  Youtube,
  MessageCircle,
  DollarSign,
  FileText,
  Tag,
  Layout,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

import { categoryLabels, projectLabels } from '@/data/mock';
import toast from 'react-hot-toast';
import type { ModCategory, ModProject } from '@/types';

export default function PublishModModal() {
  const { publishModalOpen, setPublishModalOpen } = useUIStore();


  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ModCategory>('redux');
  const [project, setProject] = useState<ModProject>('gta5rp');
  const [price, setPrice] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [isDangerous, setIsDangerous] = useState(false);
  const [requiresSubscription, setRequiresSubscription] = useState(false);
  const [subscriptionChannel, setSubscriptionChannel] = useState('');
  const [coverDragOver, setCoverDragOver] = useState(false);
  const [galleryDragOver, setGalleryDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setCategory('redux');
    setProject('gta5rp');
    setPrice(0);
    setDownloadUrl('');
    setYoutubeUrl('');
    setTelegramUrl('');
    setCoverImage(null);
    setGalleryImages([]);
    setIsDangerous(false);
    setRequiresSubscription(false);
    setSubscriptionChannel('');
  }, []);

  const handleClose = () => {
    setPublishModalOpen(false);
    resetForm();
  };

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCoverDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setCoverImage(URL.createObjectURL(file));
    }
  };

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setCoverImage(URL.createObjectURL(file));
    }
  };

  const handleGalleryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setGalleryDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const images = files.filter((f) => f.type.startsWith('image/'));
    const total = galleryImages.length + images.length;
    if (total > 10) {
      toast.error('Максимум 10 изображений в галерее');
      return;
    }
    setGalleryImages((prev) => [
      ...prev,
      ...images.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const handleGalleryFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const images = files.filter((f) => f.type.startsWith('image/'));
    const total = galleryImages.length + images.length;
    if (total > 10) {
      toast.error('Максимум 10 изображений в галерее');
      return;
    }
    setGalleryImages((prev) => [
      ...prev,
      ...images.map((f) => URL.createObjectURL(f)),
    ]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Название обязательно');
      return;
    }
    if (title.length > 120) {
      toast.error('Название должно быть не более 120 символов');
      return;
    }
    if (!description.trim()) {
      toast.error('Описание обязательно');
      return;
    }
    if (!downloadUrl.trim()) {
      toast.error('Ссылка для скачивания обязательна');
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSubmitting(false);

    toast.success('Мод отправлен на модерацию!');
    handleClose();
  };

  if (!publishModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={handleClose}
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
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 overflow-y-auto max-h-[90vh] scrollbar-thin">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-rose-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-rose-500/20">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Опубликовать мод</h2>
              <p className="text-xs text-zinc-500 mt-1">
                Поделитесь своим творением с сообществом Catarsys
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Название <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="Введите название мода"
                  className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors"
                />
                <div className="text-[10px] text-zinc-600 mt-1 text-right">
                  {title.length}/120
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Описание <span className="text-rose-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите ваш мод..."
                  rows={4}
                  className="w-full bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Категория
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ModCategory)}
                    className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 text-sm text-white outline-none focus:border-rose-500/50 transition-colors appearance-none cursor-pointer"
                  >
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5" />
                    Проект
                  </label>
                  <select
                    value={project}
                    onChange={(e) => setProject(e.target.value as ModProject)}
                    className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 text-sm text-white outline-none focus:border-rose-500/50 transition-colors appearance-none cursor-pointer"
                  >
                    {Object.entries(projectLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  Цена (0 = бесплатно)
                </label>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  placeholder="0"
                  className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5" />
                  Ссылка для скачивания <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="Ссылка на Яндекс.Диск / Google Диск"
                  className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Youtube className="w-3.5 h-3.5" />
                    Ссылка YouTube
                  </label>
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Необязательно"
                    className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5" />
                    Ссылка Telegram
                  </label>
                  <input
                    type="text"
                    value={telegramUrl}
                    onChange={(e) => setTelegramUrl(e.target.value)}
                    placeholder="Необязательно"
                    className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5" />
                  Обложка
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setCoverDragOver(true); }}
                  onDragLeave={() => setCoverDragOver(false)}
                  onDrop={handleCoverDrop}
                  onClick={() => coverInputRef.current?.click()}
                  className={`relative h-32 rounded-lg border-2 border-dashed transition-colors cursor-pointer flex items-center justify-center overflow-hidden ${
                    coverDragOver
                      ? 'border-rose-500 bg-rose-500/5'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  {coverImage ? (
                    <img
                      src={coverImage}
                      alt="Обложка"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-6 h-6 text-zinc-500 mx-auto mb-1" />
                      <p className="text-[11px] text-zinc-500">
                        Перетащите или нажмите для загрузки
                      </p>
                    </div>
                  )}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFile}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5" />
                  Изображения галереи (до 10)
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setGalleryDragOver(true); }}
                  onDragLeave={() => setGalleryDragOver(false)}
                  onDrop={handleGalleryDrop}
                  onClick={() => galleryInputRef.current?.click()}
                  className={`relative min-h-[80px] rounded-lg border-2 border-dashed transition-colors cursor-pointer flex items-center justify-center overflow-hidden ${
                    galleryDragOver
                      ? 'border-rose-500 bg-rose-500/5'
                      : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  {galleryImages.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-2 w-full">
                      {galleryImages.map((img, i) => (
                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); removeGalleryImage(i); }}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                      {galleryImages.length < 10 && (
                        <div className="w-16 h-16 rounded-lg border border-dashed border-white/20 flex items-center justify-center">
                          <Upload className="w-4 h-4 text-zinc-500" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Upload className="w-5 h-5 text-zinc-500 mx-auto mb-1" />
                      <p className="text-[11px] text-zinc-500">
                        Перетащите или нажмите для добавления
                      </p>
                    </div>
                  )}
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryFiles}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-xs text-white">Опасная модификация</p>
                      <p className="text-[10px] text-zinc-500">
                        Может содержать конфиденциальный контент
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDangerous(!isDangerous)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      isDangerous ? 'bg-amber-500' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        isDangerous ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-sky-400" />
                    <div>
                      <p className="text-xs text-white">Требуется подписка на канал</p>
                      <p className="text-[10px] text-zinc-500">
                        Пользователи должны подписаться на ваш канал
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequiresSubscription(!requiresSubscription)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      requiresSubscription ? 'bg-rose-500' : 'bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        requiresSubscription ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                {requiresSubscription && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <input
                      type="text"
                      value={subscriptionChannel}
                      onChange={(e) => setSubscriptionChannel(e.target.value)}
                      placeholder="https://t.me/ваш_канал"
                      className="w-full h-10 bg-zinc-800/60 border border-white/[0.06] rounded-lg px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-rose-500/50 transition-colors"
                    />
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="flex-1 h-10 bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Отправить на модерацию
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
