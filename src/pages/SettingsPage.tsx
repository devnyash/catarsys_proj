import { useState, useEffect } from 'react';
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

type Theme = 'light' | 'dark' | 'system';

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

function applyTheme(theme: Theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

function applyUiScale(scale: number) {
  document.documentElement.style.zoom = `${scale}%`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  useEffect(() => {
    applyTheme(settings.theme);
    applyUiScale(settings.uiScale);
  }, [settings.theme, settings.uiScale]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings, [key]: value }));
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full scrollbar-thin max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-white mb-1">Настройки</h1>
        <p className="text-sm text-zinc-500">
          Настройте Catarsys под себя
        </p>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
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
                onClick={() => update('theme', t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs transition-colors ${
                  settings.theme === t.id
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-white/[0.03] text-zinc-400 border border-white/[0.06] hover:bg-white/[0.06]'
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
              className="flex-1 h-1.5 bg-white/[0.06] rounded-full appearance-none cursor-pointer accent-rose-500"
            />
          </div>
          <div className="flex justify-between mt-1">
            {[75, 100, 125, 150].map((v) => (
              <button
                key={v}
                onClick={() => update('uiScale', v)}
                className={`text-[10px] transition-colors ${
                  settings.uiScale === v ? 'text-rose-400' : 'text-zinc-600'
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
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
                className="w-full h-9 bg-white/[0.03] border border-white/[0.06] rounded-lg pl-9 pr-3 text-xs text-white outline-none focus:border-rose-500/50 transition-colors"
              />
            </div>
            <button className="px-3 h-9 bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 text-xs rounded-lg transition-colors">
              Обзор
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white">Автообновление</p>
            <p className="text-[10px] text-zinc-500">
              Автоматически проверять обновления
            </p>
          </div>
          <button
            onClick={() => update('autoUpdate', !settings.autoUpdate)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              settings.autoUpdate ? 'bg-rose-500' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.autoUpdate ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-5 space-y-4"
      >
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Bell className="w-4 h-4 text-zinc-500" />
          Уведомления
        </h2>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white">Уведомления в приложении</p>
            <p className="text-[10px] text-zinc-500">
              Показывать всплывающие уведомления
            </p>
          </div>
          <button
            onClick={() => update('notifyApp', !settings.notifyApp)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              settings.notifyApp ? 'bg-rose-500' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.notifyApp ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white">Уведомления в Telegram</p>
            <p className="text-[10px] text-zinc-500">
              Отправлять уведомления в Telegram
            </p>
          </div>
          <button
            onClick={() => update('notifyTelegram', !settings.notifyTelegram)}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              settings.notifyTelegram ? 'bg-rose-500' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                settings.notifyTelegram ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
