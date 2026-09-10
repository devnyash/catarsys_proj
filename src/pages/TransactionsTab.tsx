import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowUpDown, ArrowDown, ArrowUp, Wallet } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';


interface Transaction {
  id: number;
  username: string;
  type: 'deposit' | 'purchase' | 'refund';
  amount: number;
  date: string;
}

const mockTransactions: Transaction[] = [
  { id: 1, username: 'devnyash', type: 'deposit', amount: 5000, date: '2024-12-10' },
  { id: 2, username: 'testuser', type: 'purchase', amount: -299, date: '2024-12-09' },
  { id: 3, username: 'moder1', type: 'refund', amount: 150, date: '2024-12-09' },
  { id: 4, username: 'newuser', type: 'deposit', amount: 1000, date: '2024-12-08' },
  { id: 5, username: 'player1', type: 'purchase', amount: -399, date: '2024-12-08' },
];

const typeLabels: Record<string, string> = {
  deposit: 'Пополнение',
  purchase: 'Покупка',
  refund: 'Возврат',
};

const typeBadgeClasses: Record<string, string> = {
  deposit: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  purchase: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  refund: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

export default function TransactionsTab() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = mockTransactions.filter(t => {
    const matchSearch = t.username.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || t.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Wallet className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Транзакции</h2>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по пользователю..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'deposit', 'purchase', 'refund'] as const).map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                typeFilter === type
                  ? 'bg-foreground text-background'
                  : 'bg-foreground/[0.05] text-muted-foreground hover:bg-foreground/[0.1]'
              }`}
            >
              {type === 'all' ? 'Все' : typeLabels[type]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((t, i) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3 hover:bg-foreground/[0.04] transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              t.type === 'deposit' ? 'bg-emerald-400/10' : t.type === 'purchase' ? 'bg-blue-400/10' : 'bg-amber-400/10'
            }`}>
              {t.type === 'deposit' ? <ArrowDown className="w-4 h-4 text-emerald-400" /> :
               t.type === 'purchase' ? <ArrowUp className="w-4 h-4 text-blue-400" /> :
               <ArrowUpDown className="w-4 h-4 text-amber-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{t.username}</p>
              <p className="text-xs text-muted-foreground">{t.date}</p>
            </div>

            <Badge className={`text-[10px] px-1.5 py-0.5 border ${typeBadgeClasses[t.type]}`}>
              {typeLabels[t.type]}
            </Badge>

            <span className={`text-sm font-semibold ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {t.amount > 0 ? '+' : ''}{t.amount} ₡
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
