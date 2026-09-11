import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Users, Package, LayoutDashboard, Shield, History, Bell, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { AdminTab } from '@/pages/AdminPage';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  action: () => void;
  category: string;
}

interface AdminCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: AdminTab) => void;
  activeTab: AdminTab;
  users: { id: number; username: string; email: string }[];
  mods: { id: number; title: string }[];
}

const sections = [
  { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard, category: 'Навигация' },
  { id: 'moderation', label: 'Модерация', icon: Shield, category: 'Навигация' },
  { id: 'mods', label: 'Каталог модов', icon: Package, category: 'Навигация' },
  { id: 'users', label: 'Пользователи', icon: Users, category: 'Навигация' },
  { id: 'reviews', label: 'Отзывы', icon: Activity, category: 'Навигация' },
  { id: 'authors', label: 'Авторы', icon: Users, category: 'Навигация' },
  { id: 'finance', label: 'Финансы', icon: Activity, category: 'Навигация' },
  { id: 'payouts', label: 'Выплаты', icon: Activity, category: 'Навигация' },
  { id: 'analytics', label: 'Аналитика', icon: Activity, category: 'Навигация' },
  { id: 'notifications', label: 'Уведомления', icon: Bell, category: 'Навигация' },
  { id: 'security', label: 'Безопасность', icon: Shield, category: 'Навигация' },
  { id: 'disputes', label: 'Диспуты', icon: Activity, category: 'Навигация' },
  { id: 'promocodes', label: 'Промокоды', icon: Activity, category: 'Навигация' },
  { id: 'categories', label: 'Категории', icon: Activity, category: 'Навигация' },
  { id: 'versions', label: 'Версии', icon: History, category: 'Навигация' },
  { id: 'geo', label: 'География', icon: Activity, category: 'Навигация' },
  { id: 'system', label: 'Система', icon: Activity, category: 'Навигация' },
  { id: 'settings', label: 'Настройки', icon: Activity, category: 'Навигация' },
  { id: 'audit', label: 'Аудит', icon: History, category: 'Навигация' },
];

export default function AdminCommandPalette({ isOpen, onClose, onNavigate, activeTab, users, mods }: AdminCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = sections.map(s => ({
    id: s.id,
    label: s.label,
    icon: s.icon,
    action: () => onNavigate(s.id as AdminTab),
    category: s.category,
  }));

  const userResults = users.filter(u =>
    u.username.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3).map(u => ({
    id: `user-${u.id}`,
    label: `${u.username} (${u.email})`,
    icon: Users,
    action: () => { onClose(); },
    category: 'Пользователи',
  }));

  const modResults = mods.filter(m =>
    m.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3).map(m => ({
    id: `mod-${m.id}`,
    label: m.title,
    icon: Package,
    action: () => { onClose(); },
    category: 'Моды',
  }));

  const allItems = [...commands, ...userResults, ...modResults];
  const filtered = query
    ? allItems.filter(item => item.label.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[selectedIndex]?.action();
    }
  }, [filtered, selectedIndex]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-foreground/[0.06]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Поиск по админке..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 h-6 text-sm focus-visible:ring-0"
          />
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Ничего не найдено</p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                onClick={item.action}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  item.id === activeTab ? 'bg-foreground/[0.12] border-l-2 border-foreground' : 
                  i === selectedIndex ? 'bg-foreground/[0.08]' : 'hover:bg-foreground/[0.04]'
                }`}
              >
                <item.icon className={`w-4 h-4 ${item.id === activeTab ? 'text-foreground' : 'text-muted-foreground'}`} />
                <span className={`text-sm flex-1 ${item.id === activeTab ? 'text-foreground font-medium' : 'text-foreground'}`}>{item.label}</span>
                {item.id === activeTab && (
                  <span className="text-[10px] font-medium text-foreground">Текущий</span>
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
