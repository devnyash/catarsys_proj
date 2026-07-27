import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, User, Lock, Loader2, Upload } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import UserAvatar from '@/components/ui/UserAvatar';
import toast from 'react-hot-toast';

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ open, onClose }: EditProfileModalProps) {
  const { user, updateProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  if (!user) return null;

  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Выберите изображение');
        return;
      }
      pendingFileRef.current = file;
      const reader = new FileReader();
      reader.onload = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Выберите изображение');
        return;
      }
      pendingFileRef.current = file;
      const reader = new FileReader();
      reader.onload = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error('Имя не может быть пустым');
      return;
    }
    if (password || confirmPassword) {
      if (password.length < 6) {
        toast.error('Пароль должен быть не короче 6 символов');
        return;
      }
      if (password !== confirmPassword) {
        toast.error('Пароли не совпадают');
        return;
      }
    }
    setIsSaving(true);
    try {
      let avatarUrl = avatar;

      // If there's a pending file, upload it to the server
      if (pendingFileRef.current) {
        const formData = new FormData();
        formData.append('file', pendingFileRef.current);
        formData.append('purpose', 'avatar');

        const uploadResult = await fetch('/api/v1/media/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: formData,
        });

        if (uploadResult.ok) {
          const uploadData = await uploadResult.json();
          // Add cache-busting timestamp so the browser fetches the new image
          const ts = Date.now();
          avatarUrl = (uploadData?.data?.url || avatar) + `?t=${ts}`;
          toast.success('Аватар загружен на сервер');
        } else {
          // Fall back to local cache if upload fails
          toast.error('Не удалось загрузить аватар на сервер, сохраняем локально');
        }
        pendingFileRef.current = null;
      }

      await updateProfile({ displayName: displayName.trim(), avatar: avatarUrl });
      toast.success(password ? 'Профиль и пароль обновлены' : 'Профиль обновлён');
      setPassword('');
      setConfirmPassword('');
      onClose();
    } catch {
      toast.error('Не удалось сохранить изменения');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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

            <h2 className="text-lg font-bold text-foreground mb-5">Редактировать профиль</h2>

            <form onSubmit={handleSave} className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div
                  className={`relative rounded-full transition-colors ${
                    isDragging ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background' : ''
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  title="Перетащите изображение сюда"
                >
                  <UserAvatar
                    name={displayName || user.username}
                    src={avatar}
                    className="w-16 h-16 border border-foreground/10 text-xl"
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="absolute -bottom-1 -right-1 p-1.5 bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-3 h-3" /> Перетащите фото или вставьте ссылку
                  </label>
                  <input
                    value={avatar.startsWith('data:') ? '' : avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://..."
                    className="w-full mt-1 px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-foreground/30"
                  />
                </div>
              </div>

              {/* Display name */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <User className="w-3 h-3" /> Имя
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-foreground/30"
                />
              </div>

              {/* Password */}
              <div className="space-y-3 border-t border-foreground/[0.06] pt-3">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Сменить пароль
                </p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Новый пароль"
                  className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-foreground/30"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Повторите пароль"
                  className="w-full px-3 py-2 bg-foreground/5 border border-foreground/10 rounded-lg text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:border-foreground/30"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 rounded-lg text-sm text-zinc-300 hover:text-foreground transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-foreground hover:bg-foreground/90 disabled:bg-foreground/20 disabled:text-muted-foreground text-background text-sm font-medium rounded-lg transition-colors"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
