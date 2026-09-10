import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Users, Package, LayoutDashboard, Shield, History, Bell, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
  onNavigate: (tab: string) => void;
  onRefresh: () => void;
  users: { id: number; username: string; email: string }[];
  mods: { id: number; title: string }[];
}

export default function AdminCommandPalette({ isOpen, onClose, onNavigate, onRefresh, users, mods }: AdminCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: CommandItem[] = [
    { id: 'tab-dashboard', label: 'Перейти к Дашборду', icon: LayoutDashboard, action: () => onNavigate('dashboard'), category: 'Навигация' },
    { id: 'tab-moderation', label: 'Перейти к Модерации', icon: Shield, action: () => onNavigate('moderation'), category: 'Навигация' },
    { id: 'tab-mods', label: 'Перейти к Модам', icon: Package, action: () => onNavigate('mods'), category: 'Навигация' },
    { id: 'tab-users', label: 'Перейти к Пользователям', icon: Users, action: () => onNavigate('users'), category: 'Навигация' },
    { id: 'tab-audit', label: 'Перейти к Аудиту', icon: History, action: () => onNavigate('audit'), category: 'Навигация' },
    { id: 'tab-notifications', label: 'Перейти к Уведомлениям', icon: Bell, action: () => onNavigate('notifications'), category: 'Навигация' },
    { id: 'tab-system', label: 'Перейти к Системе', icon: Activity, action: () => onNavigate('system'), category: 'Навигация' },
    { id: 'refresh', label: 'Обновить данные', icon: Activity, action: onRefresh, category: 'Действия' },
  ];

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
                  i === selectedIndex ? 'bg-foreground/[0.08]' : 'hover:bg-foreground/[0.04]'
                }`}
              >
                <item.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-foreground flex-1">{item.label}</span>
                <span className="text-[10px] text-muted-foreground">{item.category}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
