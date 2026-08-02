import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { modsApi } from '@/api/mods';

import { categoryLabels, projectLabels } from '@/data/mock';
import toast from 'react-hot-toast';
import type { ModCategory, ModProject, Mod } from '@/types';
import { ModCardPreview, ModDetailPreview, type ModDraft } from './ModPreview';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface DropdownOption {
  value: string;
  label: string;
}

function Dropdown({
  value,
  options,
  onChange,
  placeholder = 'Выберите...',
}: {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-10 bg-transparent border border-foreground/[0.12] rounded-lg pl-3 pr-8 text-sm text-foreground outline-none focus:border-zinc-500/50 transition-colors flex items-center justify-between cursor-pointer hover:bg-foreground/[0.03]"
      >
        <span className={selected ? 'text-foreground' : 'text-zinc-500'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute z-30 mt-1 w-full glass-panel border border-foreground/[0.1] rounded-lg overflow-hidden shadow-2xl shadow-black/40 py-1 max-h-56 overflow-y-auto scrollbar-thin"
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-foreground/[0.06] ${
                  o.value === value ? 'text-foreground font-medium' : 'text-zinc-400'
                }`}
              >
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PublishModModalProps {
  editMod?: Mod;
  onEditClose?: () => void;
}

export default function PublishModModal({ editMod, onEditClose }: PublishModModalProps) {
  const { publishModalOpen, setPublishModalOpen } = useUIStore();
  const authUser = useAuthStore((s) => s.user);
  const isEditing = !!editMod;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ModCategory>('redux');
  const [project, setProject] = useState<ModProject>('gta5rp');
  const [version, setVersion] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [telegramUrl, setTelegramUrl] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  interface GalleryItem {
    id?: number;      // existing server image id (undefined for new local files)
    url: string;      // blob URL for new files, API URL for existing ones
    file?: File;      // new file awaiting upload
  }
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [isDangerous, setIsDangerous] = useState(false);
  const [requiresSubscription, setRequiresSubscription] = useState(false);
  const [subscriptionChannel, setSubscriptionChannel] = useState('');
  const [coverDragOver, setCoverDragOver] = useState(false);
  const [galleryDragOver, setGalleryDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Цена хранится как строка (только цифры, до 6 символов), число выводится для payload/превью.
  const price = Number(priceInput) || 0;

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pendingCoverRef = useRef<File | null>(null);
  const pendingGalleryRef = useRef<File[]>([]);

  // Pre-fill form when editing
  useEffect(() => {
    if (editMod) {
      setTitle(editMod.title);
      setDescription(editMod.description);
      setCategory(editMod.category as ModCategory);
      setProject(editMod.project as ModProject);
      setVersion(editMod.version || '');
      setPriceInput(editMod.price ? String(editMod.price) : '');
      setDownloadUrl(editMod.downloadUrl || '');
      setYoutubeUrl(editMod.youtubeUrl || '');
      setTelegramUrl(editMod.telegramUrl || '');
      setIsDangerous(editMod.isDangerous);
      setRequiresSubscription(editMod.requiresSubscription);
      setSubscriptionChannel(editMod.subscriptionChannel || '');
      setCoverImage(editMod.coverImage || null);
      setGalleryItems(
        (editMod.galleryImages || []).map((url) => {
          const m = url.match(/\/gallery\/(\d+)/);
          return { id: m ? Number(m[1]) : undefined, url };
        })
      );
    }
  }, [editMod]);

  const resetForm = useCallback(() => {
    setTitle('');
    setDescription('');
    setCategory('redux');
    setProject('gta5rp');
    setPriceInput('');
    setVersion('');
    setDownloadUrl('');
    setYoutubeUrl('');
    setTelegramUrl('');
    setCoverImage(null);
    setGalleryItems([]);
    setIsDangerous(false);
    setRequiresSubscription(false);
    setSubscriptionChannel('');
  }, []);

  // Живой предпросмотр мода из текущего state формы.
  const draft = useMemo<ModDraft>(() => {
    const author = authUser
      ? {
          displayName: authUser.displayName,
          avatar: authUser.avatar,
          isVerified: authUser.isVerified,
        }
      : { displayName: 'Автор', avatar: '', isVerified: false };
    return {
      title,
      description,
      version,
      price,
      category,
      project,
      isDangerous,
      coverImage,
      galleryImages: galleryItems.map((g) => g.url),
      tags: [],
      author,
      downloadsCount: 0,
      rating: 0,
      reviewsCount: 0,
      fileSize: '—',
    };
  }, [authUser, title, description, version, price, category, project, isDangerous, coverImage, galleryItems]);

  const handleClose = () => {
    if (isEditing) {
      onEditClose?.();
    } else {
      setPublishModalOpen(false);
    }
    resetForm();
  };

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCoverDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      pendingCoverRef.current = file;
      setCoverImage(URL.createObjectURL(file));
    }
  };

  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      pendingCoverRef.current = file;
      setCoverImage(URL.createObjectURL(file));
    }
  };

  const handleGalleryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setGalleryDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    const images = files.filter((f) => f.type.startsWith('image/'));
    const total = galleryItems.length + images.length;
    if (total > 10) {
      toast.error('Максимум 10 изображений в галерее');
      return;
    }
    pendingGalleryRef.current = pendingGalleryRef.current.concat(images);
    setGalleryItems((prev) => [
      ...prev,
      ...images.map((f) => ({ url: URL.createObjectURL(f), file: f })),
    ]);
  };

  const handleGalleryFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const images = files.filter((f) => f.type.startsWith('image/'));
    const total = galleryItems.length + images.length;
    if (total > 10) {
      toast.error('Максимум 10 изображений в галерее');
      return;
    }
    pendingGalleryRef.current = pendingGalleryRef.current.concat(images);
    setGalleryItems((prev) => [
      ...prev,
      ...images.map((f) => ({ url: URL.createObjectURL(f), file: f })),
    ]);
  };

  const removeGalleryImage = async (index: number) => {
    const item = galleryItems[index];
    if (item?.id && editMod) {
      try {
        await fetch(`/api/v1/media/mod/${editMod.id}/gallery/${item.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        });
      } catch {
        // ignore – still remove locally
      }
    }
    setGalleryItems((prev) => prev.filter((_, i) => i !== index));
  };

  const moveGalleryImage = (index: number, dir: -1 | 1) => {
    setGalleryItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const replaceGalleryImage = (index: number, file: File) => {
    if (!file.type.startsWith('image/')) return;
    const newUrl = URL.createObjectURL(file);
    setGalleryItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, url: newUrl, file, id: undefined } : item
      )
    );
  };

  const uploadFile = async (
    purpose: string,
    modId: number,
    file: File
  ): Promise<{ image_id?: number; url?: string } | null> => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`/api/v1/media/upload?purpose=${purpose}&mod_id=${modId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: fd,
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data ?? null;
    } catch {
      return null;
    }
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
    try {
      let modId: number;

      if (isEditing && editMod) {
        await modsApi.update(editMod.id, {
          title,
          description,
          category,
          project,
          price,
          version: version || undefined,
          downloadUrl,
          youtubeUrl: youtubeUrl || undefined,
          telegramUrl: telegramUrl || undefined,
          requiresSubscription,
          subscriptionChannel: subscriptionChannel || undefined,
        });
        modId = editMod.id;
        toast.success('Мод обновлён!');
      } else {
        const created: any = await modsApi.create({
          title,
          description,
          category,
          project,
          price,
          version: version || undefined,
          download_url: downloadUrl,
        });
        modId = created.id;
        toast.success('Мод отправлен на модерацию!');
      }

      // Upload cover image if selected. Cover responses carry { url, path } but no image_id,
      // so success is determined by the presence of any data, not image_id.
      if (pendingCoverRef.current) {
        const data = await uploadFile('cover', modId, pendingCoverRef.current);
        if (data) toast.success('Обложка загружена');
        else toast.error('Не удалось загрузить обложку');
        pendingCoverRef.current = null;
      }

      // Upload new gallery files and keep their position
      const newIdByIndex = new Map<number, number>();
      let uploaded = 0;
      for (const [idx, item] of galleryItems.entries()) {
        if (item.file && item.id === undefined) {
          const data = await uploadFile('gallery', modId, item.file);
          if (data && data.image_id !== undefined) {
            newIdByIndex.set(idx, data.image_id);
            uploaded++;
          }
        }
      }
      if (uploaded > 0) toast.success(`Загружено ${uploaded} изображений галереи`);
      pendingGalleryRef.current = [];

      // Persist gallery order (existing ids + newly uploaded ids in current order)
      if (isEditing && editMod) {
        const imageIds: number[] = [];
        galleryItems.forEach((item, idx) => {
          if (item.id !== undefined) imageIds.push(item.id);
          else {
            const newId = newIdByIndex.get(idx);
            if (newId !== undefined) imageIds.push(newId);
          }
        });
        if (imageIds.length > 1) {
          try {
            await fetch(`/api/v1/media/mod/${modId}/gallery/reorder`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('access_token')}`,
              },
              body: JSON.stringify({ image_ids: imageIds }),
            });
          } catch {
            // ignore reorder errors – upload still succeeded
          }
        }
      }

      handleClose();
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка при публикации мода');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!publishModalOpen && !editMod) return null;

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
          className="relative w-full max-w-5xl max-h-[90vh] glass-panel border border-foreground/[0.1] rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-10 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-zinc-400 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="p-6 overflow-y-auto max-h-[90vh] scrollbar-thin">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-zinc-500 to-zinc-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-zinc-500/20">
                <Upload className="w-5 h-5 text-foreground" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {isEditing ? 'Редактировать мод' : 'Опубликовать мод'}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                {isEditing ? 'Измените информацию о моде' : 'Поделитесь своим творением с сообществом Catarsys'}
              </p>
            </div>

            {/* Двухколоночный макет: слева форма, справа живой предпросмотр */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Левая колонка — форма */}
              <div className="flex-1 space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Название <span className="text-zinc-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="Введите название мода"
                  className="w-full h-10 bg-transparent border border-foreground/[0.12] rounded-lg px-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
                />
                <div className="text-[10px] text-zinc-600 mt-1 text-right">
                  {title.length}/120
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Описание <span className="text-zinc-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Опишите ваш мод..."
                  rows={4}
                  maxLength={1000}
                  className="w-full bg-transparent border border-foreground/[0.12] rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors resize-none"
                />
                <div className="text-[10px] text-zinc-600 mt-1 text-right">
                  {description.length}/1000
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Категория
                  </label>
                  <Dropdown
                    value={category}
                    options={Object.entries(categoryLabels).map(([key, label]) => ({ value: key, label }))}
                    onChange={(v) => setCategory(v as ModCategory)}
                    placeholder="Категория"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5" />
                    Проект
                  </label>
                  <Dropdown
                    value={project}
                    options={Object.entries(projectLabels).map(([key, label]) => ({ value: key, label }))}
                    onChange={(v) => setProject(v as ModProject)}
                    placeholder="Проект"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    Версия
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    maxLength={8}
                    className="w-full h-10 bg-transparent border border-foreground/[0.12] rounded-lg px-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
                  />
                  <div className="text-[10px] text-zinc-600 mt-1 text-right">
                    {version.length}/8
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    Цена (0 = бесплатно)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="0"
                    maxLength={6}
                    className="w-full h-10 bg-transparent border border-foreground/[0.12] rounded-lg px-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
                  />
                  <div className="text-[10px] text-zinc-600 mt-1 text-right">
                    {priceInput.length}/6
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5" />
                  Ссылка для скачивания <span className="text-zinc-400">*</span>
                </label>
                <input
                  type="text"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="Ссылка на Яндекс.Диск / Google Диск"
                  maxLength={400}
                  className="w-full h-10 bg-transparent border border-foreground/[0.12] rounded-lg px-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
                />
                <div className="text-[10px] text-zinc-600 mt-1 text-right">
                  {downloadUrl.length}/400
                </div>
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
                    maxLength={400}
                    className="w-full h-10 bg-transparent border border-foreground/[0.12] rounded-lg px-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
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
                    maxLength={400}
                    className="w-full h-10 bg-transparent border border-foreground/[0.12] rounded-lg px-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
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
                      ? 'border-zinc-500 bg-zinc-500/5'
                      : 'border-foreground/[0.08] bg-foreground/[0.02] hover:border-foreground/20'
                  }`}
                >
                  {coverImage ? (
                    <div className="w-full h-full flex items-center justify-center p-3">
                      <img
                        src={coverImage}
                        alt="Обложка"
                        className="max-h-full max-w-full object-contain rounded-md border border-foreground/10"
                      />
                    </div>
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
                      ? 'border-zinc-500 bg-zinc-500/5'
                      : 'border-foreground/[0.08] bg-foreground/[0.02] hover:border-foreground/20'
                  }`}
                >
                  {galleryItems.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-2 w-full">
                      {galleryItems.map((item, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden group">
                          <img
                            src={item.url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-1 left-1 px-1 text-[9px] bg-black/60 rounded text-foreground/90">
                            {i + 1}
                          </span>
                          <div className="absolute inset-x-0 bottom-0 bg-black/70 backdrop-blur-sm flex items-center justify-center gap-0.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => { e.stopPropagation(); moveGalleryImage(i, -1); }}
                                  aria-label="Переместить влево"
                                  className="p-1 text-zinc-300 hover:text-foreground hover:bg-white/10 rounded"
                                >
                                  <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Переместить влево</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <label
                                  aria-label="Заменить изображение"
                                  tabIndex={0}
                                  className="p-1 text-zinc-300 hover:text-foreground hover:bg-white/10 rounded cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) replaceGalleryImage(i, f);
                                    }}
                                  />
                                </label>
                              </TooltipTrigger>
                              <TooltipContent side="top">Заменить изображение</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => { e.stopPropagation(); moveGalleryImage(i, 1); }}
                                  aria-label="Переместить вправо"
                                  className="p-1 text-zinc-300 hover:text-foreground hover:bg-white/10 rounded"
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Переместить вправо</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeGalleryImage(i); }}
                                  aria-label="Удалить"
                                  className="p-1 text-zinc-300 hover:text-red-400 hover:bg-red-500/10 rounded"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Удалить</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                      {galleryItems.length < 10 && (
                        <div
                          className="w-20 h-20 rounded-lg border border-dashed border-foreground/20 flex items-center justify-center cursor-pointer hover:border-foreground/40 transition-colors"
                          onClick={(e) => { e.stopPropagation(); galleryInputRef.current?.click(); }}
                        >
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
                    <AlertTriangle className="w-4 h-4 text-zinc-400" />
                    <div>
                      <p className="text-xs text-foreground">Опасная модификация</p>
                      <p className="text-[10px] text-zinc-500">
                        Может содержать конфиденциальный контент
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDangerous(!isDangerous)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      isDangerous ? 'bg-zinc-500' : 'bg-foreground/10'
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
                    <Users className="w-4 h-4 text-zinc-400" />
                    <div>
                      <p className="text-xs text-foreground">Требуется подписка на канал</p>
                      <p className="text-[10px] text-zinc-500">
                        Пользователи должны подписаться на ваш канал
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRequiresSubscription(!requiresSubscription)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      requiresSubscription ? 'bg-zinc-500' : 'bg-foreground/10'
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
                      maxLength={400}
                      className="w-full h-10 bg-transparent border border-foreground/[0.12] rounded-lg px-3 text-sm text-foreground placeholder:text-zinc-500 outline-none focus:border-zinc-500/50 transition-colors"
                    />
                  </motion.div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleClose}
                  className="flex-1 h-10 bg-foreground/[0.05] hover:bg-foreground/[0.08] text-zinc-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 h-10 bg-foreground hover:bg-foreground/90 text-background text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {isEditing ? 'Сохранить изменения' : 'Отправить на модерацию'}
                    </>
                  )}
                </button>
              </div>
              </div>

              {/* Правая колонка — живой предпросмотр */}
              <div className="lg:w-[340px] flex-shrink-0 space-y-4 lg:sticky lg:top-0 lg:self-start">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                    Предпросмотр в ленте
                  </p>
                  <ModCardPreview draft={draft} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                    Предпросмотр при просмотре
                  </p>
                  <ModDetailPreview draft={draft} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
