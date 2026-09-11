import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, Download, ArrowUp, ArrowDown, Home } from "lucide-react";
import type { AdminTab } from "@/pages/AdminPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const summaryData = [
  { label: 'Сегодня', value: 12500, change: '+12%', icon: DollarSign, color: 'text-emerald-400' },
  { label: 'Неделя', value: 84300, change: '+8%', icon: TrendingUp, color: 'text-blue-400' },
  { label: 'Месяц', value: 342000, change: '+23%', icon: TrendingDown, color: 'text-purple-400' },
  { label: 'Всего', value: 1250000, change: '+45%', icon: DollarSign, color: 'text-amber-400' },
];

const transactions = [
  { id: 1, type: 'deposit', amount: 5000, user: 'player1', date: '10.12.2024' },
  { id: 2, type: 'purchase', amount: -299, user: 'player2', date: '10.12.2024' },
  { id: 3, type: 'refund', amount: 150, user: 'player3', date: '09.12.2024' },
  { id: 4, type: 'deposit', amount: 1000, user: 'player4', date: '09.12.2024' },
  { id: 5, type: 'purchase', amount: -399, user: 'player5', date: '08.12.2024' },
];

export default function FinanceTab({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => onNavigate("home")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs">Главная</span>
      </Button>

      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Финансы</h2>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryData.map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{item.label}</span>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <p className="text-xl font-bold text-foreground">{item.value.toLocaleString()} ₡</p>
            <p className={`text-xs ${item.change.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>{item.change}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-8 text-xs" />
        <span className="text-xs text-muted-foreground">—</span>
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-8 text-xs" />
        <Button size="sm" variant="outline"><Download className="w-3.5 h-3.5 mr-1" /> Экспорт</Button>
      </div>

      {/* Transactions */}
      <div className="space-y-2">
        {transactions.map((t, i) => (
          <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.amount > 0 ? 'bg-emerald-400/10' : 'bg-red-400/10'}`}>
              {t.amount > 0 ? <ArrowDown className="w-4 h-4 text-emerald-400" /> : <ArrowUp className="w-4 h-4 text-red-400" />}
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground">{t.user}</p>
              <p className="text-xs text-muted-foreground">{t.date}</p>
            </div>
            <span className={`text-sm font-semibold ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {t.amount > 0 ? '+' : ''}{t.amount} ₡
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
