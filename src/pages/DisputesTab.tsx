import { useState } from 'react';
import { motion } from 'framer-motion';
import { Gavel, Check, X, Clock, CheckCircle, XCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminTab } from "@/pages/AdminPage";

const mockDisputes = [
  { id: 1, user: 'player1', mod: 'Bad Mod v1.0', amount: 299, status: 'open', date: '10.12.2024' },
  { id: 2, user: 'player2', mod: 'Graphics Pack', amount: 150, status: 'resolved', date: '09.12.2024' },
  { id: 3, user: 'player3', mod: 'Weapon Pack', amount: 399, status: 'open', date: '08.12.2024' },
];

const statusConfig: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  open: { label: 'Открыт', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  resolved: { label: 'Решён', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  rejected: { label: 'Отклонён', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
};

export default function DisputesTab({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const [tab, setTab] = useState('open');

  const filtered = mockDisputes.filter(d => tab === 'all' || d.status === tab);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => onNavigate("home")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs">Главная</span>
      </Button>

      <div className="flex items-center gap-2">
        <Gavel className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Диспуты</h2>
      </div>

      <div className="flex gap-1">
        {['open', 'resolved', 'rejected', 'all'].map(s => (
          <button key={s} onClick={() => setTab(s)}
            className={`px-3 py-1.5 text-xs rounded-lg ${tab === s ? 'bg-foreground text-background' : 'bg-foreground/[0.05] text-muted-foreground'}`}>
            {s === 'all' ? 'Все' : s === 'open' ? 'Открытые' : s === 'resolved' ? 'Решённые' : 'Отклонённые'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((dispute, i) => {
          const config = statusConfig[dispute.status];
          return (
            <motion.div key={dispute.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3">
              <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center`}>
                <config.icon className={`w-4 h-4 ${config.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">{dispute.user} → {dispute.mod}</p>
                <p className="text-xs text-muted-foreground">{dispute.date}</p>
              </div>
              <span className="text-sm font-semibold text-foreground">{dispute.amount} ₡</span>
              {dispute.status === 'open' && (
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
