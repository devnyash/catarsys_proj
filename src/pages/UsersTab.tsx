import { useState } from 'react';
import { motion } from 'framer-motion';
import { Ban, UserX, Download, Search } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import UserAvatar from '@/components/ui/UserAvatar';
import type { AdminUser } from '@/api/admin';

interface UsersTabProps {
  users: AdminUser[];
  onBan: (user: AdminUser) => void;
  onSetRole: (user: AdminUser, role: 'user' | 'moderator' | 'admin') => void;
  isLoading: boolean;
}

const roleBadgeClasses: Record<string, string> = {
  user: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  moderator: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  superadmin: 'bg-red-500/10 text-red-400 border-red-500/20',
};

const roleLabels: Record<string, string> = {
  user: 'Пользователь',
  moderator: 'Модератор',
  admin: 'Админ',
  superadmin: 'Супер-админ',
};

export default function UsersTab({ users, onBan, onSetRole, isLoading }: UsersTabProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportCSV = () => {
    const rows = [['Username', 'Email', 'Role', 'Balance', 'Status']];
    filtered.forEach(u => {
      rows.push([u.username, u.email, roleLabels[u.role], String(u.balance), u.is_banned ? 'Banned' : 'Active']);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск пользователей..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <Download className="w-3.5 h-3.5 mr-1" />
          Экспорт
        </Button>
        {selected.size > 0 && (
          <Button size="sm" variant="destructive" onClick={() => {
            filtered.filter(u => selected.has(u.id) && !u.is_banned).forEach(u => onBan(u));
            setSelected(new Set());
          }}>
            <Ban className="w-3.5 h-3.5 mr-1" />
            Забанить ({selected.size})
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((u, i) => (
          <motion.div
            key={u.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3 hover:bg-foreground/[0.04] transition-colors"
          >
            <input
              type="checkbox"
              checked={selected.has(u.id)}
              onChange={() => toggleSelect(u.id)}
              className="rounded border-foreground/20"
            />

            <UserAvatar name={u.username} className="w-8 h-8 !rounded-lg" />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{u.username}</p>
              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
            </div>

            <Badge className={`text-[10px] px-1.5 py-0.5 border ${roleBadgeClasses[u.role]}`}>
              {roleLabels[u.role]}
            </Badge>

            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${u.is_banned ? 'bg-red-400' : 'bg-emerald-400'}`} />
            </div>

            <div className="flex items-center gap-1">
              <select
                value={u.role}
                onChange={e => onSetRole(u, e.target.value as any)}
                className="h-7 px-2 text-xs bg-foreground/[0.05] border border-foreground/[0.1] rounded"
              >
                <option value="user">User</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </select>
              <Button
                size="icon"
                variant="ghost"
                className="w-7 h-7 text-red-400 hover:bg-red-400/10"
                onClick={() => onBan(u)}
              >
                <UserX className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
