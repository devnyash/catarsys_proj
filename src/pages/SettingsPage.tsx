import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Moon,
  Sun,
  Monitor,
  Download,
  Bell,
  FolderOpen,
} from 'lucide-react';
import type { AppSettings } from '@/types';
import { useThemeStore, type Theme } from '@/store/themeStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

const STORAGE_KEY = 'catarsys_settings';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore parse errors
  }
  return {
    theme: 'dark',
    autoUpdate: true,
    notifyApp: true,
    notifyTelegram: false,
    downloadPath: '~/Downloads/Catarsys/',
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const { theme, setTheme } = useThemeStore();
  const folderInputRef = useRef<HTMLInputElement>(null);

  // UI scaling was removed – make sure any previously applied zoom is cleared.
  useEffect(() => {
    document.documentElement.style.zoom = '';
  }, []);

  // Enable directory selection on the hidden fallback input.
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      // Persist from the freshest state to avoid stale-closure overwrites.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const changeTheme = (t: Theme) => {
    setTheme(t);
    update('theme', t);
  };

  const handleFolderInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const rel = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath || '';
      const folder = rel ? rel.split('/')[0] : files[0].name;
      if (folder) update('downloadPath', `${folder}/`);
    }
    // Allow re-selecting the same folder later.
    e.target.value = '';
  };

  const pickFolder = async () => {
    // 1) Native desktop bridge (pywebview), if available.
    try {
      const api = (window as unknown as { pywebview?: { api?: { pick_folder?: () => Promise<string> } } }).pywebview?.api;
      if (api?.pick_folder) {
        const folder = await api.pick_folder();
        if (folder) update('downloadPath', folder);
        return;
      }
    } catch {
      // ignore
    }

    // 2) File System Access API (Chromium-based browsers).
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await (window as unknown as { showDirectoryPicker: () => Promise<{ name: string }> }).showDirectoryPicker();
        if (handle?.name) update('downloadPath', `${handle.name}/`);
        return;
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
    }

    // 3) Fallback: hidden <input type="file" webkitdirectory>.
    folderInputRef.current?.click();
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full scrollbar-thin max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-foreground mb-1">Настройки</h1>
        <p className="text-sm text-zinc-500">
          Настройте Catarsys под себя
        </p>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Monitor className="w-4 h-4 text-zinc-500" />
          Внешний вид
        </h2>

        {/* Theme */}
        <div>
          <label className="text-xs text-zinc-500 mb-2 block">Тема</label>
          <div className="flex gap-2">
            {([
              { id: 'light' as Theme, icon: Sun, label: 'Светлая' },
              { id: 'dark' as Theme, icon: Moon, label: 'Темная' },
              { id: 'system' as Theme, icon: Monitor, label: 'Системная' },
            ]).map((t) => (
              <Button
                key={t.id}
                variant={theme === t.id ? 'default' : 'ghost'}
                onClick={() => changeTheme(t.id)}
                className={`flex items-center gap-2 text-xs ${theme === t.id ? 'bg-foreground text-background border border-foreground' : ''}`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </Button>
            ))}
          </div>
        </div>

      </motion.div>

      {/* Downloads */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Download className="w-4 h-4 text-zinc-500" />
          Загрузки
        </h2>

        <div>
          <label className="text-xs text-zinc-500 mb-2 block">
            Папка загрузок
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="text"
                value={settings.downloadPath}
                onChange={(e) => update('downloadPath', e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={pickFolder}
              className="flex items-center gap-1.5 px-3 text-xs text-zinc-300"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Обзор
            </Button>
            {/* Hidden fallback folder picker */}
            <input
              ref={folderInputRef}
              type="file"
              multiple
              onChange={handleFolderInput}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-foreground">Автообновление</p>
            <p className="text-[10px] text-zinc-500">
              Автоматически проверять обновления
            </p>
          </div>
          <Switch
            checked={settings.autoUpdate}
            onCheckedChange={(checked) => update('autoUpdate', checked)}
          />
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-4 h-4 text-zinc-500" />
          Уведомления
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-foreground">Уведомления в приложении</p>
            <p className="text-[10px] text-zinc-500">
              Показывать всплывающие уведомления
            </p>
          </div>
          <Switch
            checked={settings.notifyApp}
            onCheckedChange={(checked) => update('notifyApp', checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-foreground">Уведомления в Telegram</p>
            <p className="text-[10px] text-zinc-500">
              Отправлять уведомления в Telegram
            </p>
          </div>
          <Switch
            checked={settings.notifyTelegram}
            onCheckedChange={(checked) => update('notifyTelegram', checked)}
          />
        </div>
      </motion.div>
    </div>
  );
}
