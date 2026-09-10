import { useState } from 'react';
import { motion } from 'framer-motion';
import { History, Filter, Shield, Ban, DollarSign, UserCog, Package } from "lucide-react";
import { Input } from "@/components/ui/input";

const mockAuditLog = [
  { id: 1, admin: 'devnyash', action: 'approve_mod', target: 'Ultimate Graphics 2.5', timestamp: '2024-12-10 14:32' },
  { id: 2, admin: 'devnyash', action: 'ban_user', target: 'spammer123', timestamp: '2024-12-10 13:15' },
  { id: 3, admin: 'superadmin', action: 'set_balance', target: 'testuser', timestamp: '2024-12-09 18:45' },
  { id: 4, admin: 'devnyash', action: 'reject_mod', target: 'Bad Mod v1.0', timestamp: '2024-12-09 16:20' },
  { id: 5, admin: 'superadmin', action: 'change_role', target: 'moder1', timestamp: '2024-12-09 12:00' },
  { id: 6, admin: 'devnyash', action: 'ban_mod', target: 'Malicious Mod', timestamp: '2024-12-08 22:10' },
  { id: 7, admin: 'superadmin', action: 'approve_mod', target: 'Real Cars Pack', timestamp: '2024-12-08 15:30' },
];

const actionIcons: Record<string, React.ElementType> = {
  approve_mod: Package,
  reject_mod: Package,
  ban_mod: Ban,
  ban_user: Ban,
  set_balance: DollarSign,
  change_role: UserCog,
};

const actionLabels: Record<string, string> = {
  approve_mod: 'Одобрил мод',
  reject_mod: 'Отклонил мод',
  ban_mod: 'Забанил мод',
  ban_user: 'Забанил пользователя',
  set_balance: 'Изменил баланс',
  change_role: 'Изменил роль',
};

const actionColors: Record<string, string> = {
  approve_mod: 'text-emerald-400',
  reject_mod: 'text-amber-400',
  ban_mod: 'text-red-400',
  ban_user: 'text-red-400',
  set_balance: 'text-blue-400',
  change_role: 'text-purple-400',
};

export default function AuditTab() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filtered = mockAuditLog.filter(entry => {
    const matchSearch = entry.admin.toLowerCase().includes(search.toLowerCase()) ||
                       entry.target.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'all' || entry.action === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Журнал аудита</h2>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по админу или цели..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="h-9 px-3 text-xs bg-foreground/[0.05] border border-foreground/[0.1] rounded-lg"
        >
          <option value="all">Все действия</option>
          <option value="approve_mod">Одобрения</option>
          <option value="reject_mod">Отклонения</option>
          <option value="ban_mod">Баны модов</option>
          <option value="ban_user">Баны пользователей</option>
          <option value="set_balance">Изменения баланса</option>
          <option value="change_role">Смены ролей</option>
        </select>
      </div>

      {/* Log */}
      <div className="space-y-2">
        {filtered.map((entry, i) => {
          const Icon = actionIcons[entry.action] || Shield;
          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3 hover:bg-foreground/[0.04] transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-foreground/[0.05] flex items-center justify-center">
                <Icon className={`w-4 h-4 ${actionColors[entry.action]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{entry.admin}</span>{' '}
                  <span className="text-muted-foreground">{actionLabels[entry.action]}</span>{' '}
                  <span className="font-medium">{entry.target}</span>
                </p>
                <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Записей не найдено</p>
        </div>
      )}
    </div>
  );
}
