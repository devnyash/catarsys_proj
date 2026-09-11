import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Eye, Ban, ClipboardList, Search, Home } from "lucide-react";
import type { AdminTab } from "@/pages/AdminPage";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminPendingMod } from '@/api/admin';
import { categoryLabels } from '@/data/mock';

interface ModerationTabProps {
  queue: AdminPendingMod[];
  onApprove: (mod: AdminPendingMod) => void;
  onReject: (modId: number, reason: string) => void;
  onBan: (modId: number, reason: string) => void;
  isLoading: boolean;
  onNavigate: (tab: AdminTab) => void;
}

export default function ModerationTab({ queue, onApprove, onReject, onBan, isLoading, onNavigate }: ModerationTabProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [reasonModal, setReasonModal] = useState<{ mod: AdminPendingMod; mode: 'reject' | 'ban' } | null>(null);
  const [reason, setReason] = useState('');
  const [detailMod, setDetailMod] = useState<AdminPendingMod | null>(null);
  const [search, setSearch] = useState('');

  const filtered = queue.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.author_username?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBatchApprove = () => {
    filtered.filter(m => selected.has(m.id)).forEach(onApprove);
    setSelected(new Set());
  };

  const openReasonModal = (mod: AdminPendingMod, mode: 'reject' | 'ban') => {
    setReasonModal({ mod, mode });
    setReason('');
  };

  const confirmReason = () => {
    if (!reasonModal || reason.trim().length < 10) return;
    const fn = reasonModal.mode === 'reject' ? onReject : onBan;
    fn(reasonModal.mod.id, reason.trim());
    setReasonModal(null);
    setReason('');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-12 text-center"
      >
        <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">Очередь пуста</h3>
        <p className="text-sm text-muted-foreground">Все моды проверены!</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" onClick={() => onNavigate("home")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs">Главная</span>
      </Button>
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск модов..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {selected.size > 0 && (
          <Button size="sm" variant="outline" onClick={handleBatchApprove}>
            <Check className="w-3.5 h-3.5 mr-1" />
            Одобрить ({selected.size})
          </Button>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((mod, i) => (
          <motion.div
            key={mod.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3 hover:bg-foreground/[0.04] transition-colors"
          >
            <input
              type="checkbox"
              checked={selected.has(mod.id)}
              onChange={() => toggleSelect(mod.id)}
              className="rounded border-foreground/20"
            />

            <div className="w-12 h-8 rounded-lg bg-foreground/[0.05] flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate hover:underline cursor-pointer" onClick={() => setDetailMod(mod)}>
                {mod.title}
              </p>
              <p className="text-xs text-muted-foreground">
                @{mod.author_username || `Автор #${mod.author_id}`} · {mod.category ? categoryLabels[mod.category] || mod.category : 'Без категории'} · {mod.price > 0 ? `${mod.price} ₡` : 'Бесплатно'}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="w-8 h-8 text-emerald-400 hover:bg-emerald-400/10" onClick={() => onApprove(mod)}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="w-8 h-8 text-amber-400 hover:bg-amber-400/10" onClick={() => openReasonModal(mod, 'reject')}>
                <X className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="w-8 h-8 text-red-400 hover:bg-red-400/10" onClick={() => openReasonModal(mod, 'ban')}>
                <Ban className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="w-8 h-8 text-muted-foreground hover:bg-foreground/10" onClick={() => setDetailMod(mod)}>
                <Eye className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Reason Modal */}
      <Dialog open={!!reasonModal} onOpenChange={() => setReasonModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{reasonModal?.mode === 'reject' ? 'Отклонить мод' : 'Забанить мод'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Причина (минимум 10 символов)..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="min-h-[80px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReasonModal(null)}>Отмена</Button>
              <Button
                variant={reasonModal?.mode === 'reject' ? 'default' : 'destructive'}
                onClick={confirmReason}
                disabled={reason.trim().length < 10}
              >
                {reasonModal?.mode === 'reject' ? 'Отклонить' : 'Забанить'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={!!detailMod} onOpenChange={() => setDetailMod(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailMod?.title}</DialogTitle>
          </DialogHeader>
          {detailMod && (
            <div className="space-y-3">
              <div className="rounded-lg bg-foreground/[0.03] p-3">
                <p className="text-sm text-muted-foreground">Автор: @{detailMod.author_username || `Автор #${detailMod.author_id}`}</p>
                <p className="text-sm text-muted-foreground">Категория: {detailMod.category ? categoryLabels[detailMod.category] || detailMod.category : 'Без категории'}</p>
                <p className="text-sm text-muted-foreground">Цена: {detailMod.price > 0 ? `${detailMod.price} ₡` : 'Бесплатно'}</p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => { onApprove(detailMod); setDetailMod(null); }}>
                  <Check className="w-4 h-4 mr-1" /> Одобрить
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => { openReasonModal(detailMod, 'reject'); setDetailMod(null); }}>
                  <X className="w-4 h-4 mr-1" /> Отклонить
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Package({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  );
}
