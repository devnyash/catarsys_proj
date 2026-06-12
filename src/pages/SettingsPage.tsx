import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Moon,
  Sun,
  Monitor,
  ZoomIn,
  Download,
  Bell,
  FolderOpen,
} from 'lucide-react';
import type { AppSettings } from '@/types';
import { useThemeStore, type Theme } from '@/store/themeStore';

const STORAGE_KEY = 'catarsys_settings';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (error) {}
  return {
    theme: 'dark',
    uiScale: 100,
    autoUpdate: true,
    notifyApp: true,
    notifyTelegram: false,
    downloadPath: '~/Downloads/Catarsys/',
  };
}

function applyUiScale(scale: number) {
  document.documentElement.style.zoom = `${scale}%`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const { theme, setTheme } = useThemeStore();
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    applyUiScale(settings.uiScale);
  }, [settings.uiScale]);

  // Enable directory selection on the hidden fallback input.
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, [key]: value }));
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
      const api = (window as any).pywebview?.api;
      if (api?.pick_folder) {
        const folder = await api.pick_folder();
        if (folder) update('downloadPath', folder);
        return;
      }
    } catch (err) {}

    // 2) File System Access API (Chromium-based browsers).
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await (window as any).showDirectoryPicker();
        if (handle?.name) update('downloadPath', `${handle.name}/`);
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
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
              <button
                key={t.id}
                onClick={() => changeTheme(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-colors ${
                  theme === t.id
                    ? 'bg-foreground text-background border border-foreground'
                    : 'bg-foreground/[0.03] text-zinc-400 border border-foreground/[0.06] hover:bg-foreground/[0.06]'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* UI Scale */}
        <div>
          <label className="text-xs text-zinc-500 mb-2 block">
            Масштаб интерфейса: {settings.uiScale}%
          </label>
          <div className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-zinc-500" />
            <input
              type="range"
              min={75}
              max={150}
              step={25}
              value={settings.uiScale}
              onChange={(e) => update('uiScale', Number(e.target.value))}
              className="flex-1 h-1.5 bg-foreground/[0.06] rounded-full appearance-none cursor-pointer accent-foreground"
            />
          </div>
          <div className="flex justify-between mt-1">
            {[75, 100, 125, 150].map((v) => (
              <button
                key={v}
                onClick={() => update('uiScale', v)}
                className={`text-[10px] transition-colors ${
                  settings.uiScale === v ? 'text-foreground font-semibold' : 'text-zinc-600'
                }`}
              >
                {v}%
              </button>
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
              <input
                type="text"
                value={settings.downloadPath}
                onChange={(e) => update('downloadPath', e.target.value)}
                className="w-full h-9 bg-foreground/[0.03] border border-foreground/[0.06] rounded-lg pl-9 pr-3 text-xs text-foreground outline-none focus:border-foreground/40 transition-colors"
              />
            </div>
            <button
              onClick={pickFolder}
              className="flex items-center gap-1.5 px-3 h-9 bg-foreground/[0.05] hover:bg-foreground/[0.08] text-zinc-300 text-xs rounded-lg transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Обзор
            </button>
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
          <button
            onClick={() => update('autoUpdate', !settings.autoUpdate)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              settings.autoUpdate ? 'bg-foreground' : 'bg-foreground/20'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform ${
                settings.autoUpdate ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
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
          <button
            onClick={() => update('notifyApp', !settings.notifyApp)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              settings.notifyApp ? 'bg-foreground' : 'bg-foreground/20'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform ${
                settings.notifyApp ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-foreground">Уведомления в Telegram</p>
            <p className="text-[10px] text-zinc-500">
              Отправлять уведомления в Telegram
            </p>
          </div>
          <button
            onClick={() => update('notifyTelegram', !settings.notifyTelegram)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              settings.notifyTelegram ? 'bg-foreground' : 'bg-foreground/20'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-background rounded-full transition-transform ${
                settings.notifyTelegram ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
