import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Check, X, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockPayouts = [
  { id: 1, author: 'devnyash', amount: 5000, status: 'pending', date: '10.12.2024' },
  { id: 2, author: 'modder1', amount: 3200, status: 'approved', date: '09.12.2024' },
  { id: 3, author: 'creator99', amount: 8500, status: 'pending', date: '09.12.2024' },
  { id: 4, author: 'newmodder', amount: 500, status: 'rejected', date: '08.12.2024' },
];

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending: { label: 'Ожидает', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  approved: { label: 'Одобрено', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  rejected: { label: 'Отклонено', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
};

export default function PayoutsTab() {
  const [tab, setTab] = useState('pending');

  const filtered = mockPayouts.filter(p => tab === 'all' || p.status === tab);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Выплаты</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {['pending', 'approved', 'rejected', 'all'].map(s => (
          <button key={s} onClick={() => setTab(s)}
            className={`px-3 py-1.5 text-xs rounded-lg ${tab === s ? 'bg-foreground text-background' : 'bg-foreground/[0.05] text-muted-foreground'}`}>
            {s === 'all' ? 'Все' : s === 'pending' ? 'Ожидающие' : s === 'approved' ? 'Одобренные' : 'Отклонённые'}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((payout, i) => {
          const config = statusConfig[payout.status];
          return (
            <motion.div key={payout.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3">
              <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                <config.icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{payout.author}</p>
                <p className="text-xs text-muted-foreground">{payout.date}</p>
              </div>
              <span className="text-sm font-semibold text-foreground">{payout.amount.toLocaleString()} ₡</span>
              {payout.status === 'pending' && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-emerald-400 hover:bg-emerald-400/10"><Check className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-red-400 hover:bg-red-400/10"><X className="w-3.5 h-3.5" /></Button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
