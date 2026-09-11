import { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, Plus, Search, Trash2, Edit, Home } from "lucide-react";
import type { AdminTab } from "@/pages/AdminPage";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const mockPromocodes = [
  { id: 1, code: 'WELCOME10', discount: 10, usages: 45, limit: 100, expires: '2024-12-31', active: true },
  { id: 2, code: 'SAVE20', discount: 20, usages: 12, limit: 50, expires: '2024-12-25', active: true },
  { id: 3, code: 'VIP30', discount: 30, usages: 98, limit: 100, expires: '2024-12-15', active: false },
];

export default function PromocodesTab({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const filtered = mockPromocodes.filter(p =>
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => onNavigate("home")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs">Главная</span>
      </Button>

      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Промокоды</h2>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Создать</Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((promo, i) => (
          <motion.div key={promo.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3">
            <div className="w-8 h-8 rounded-lg bg-foreground/[0.05] flex items-center justify-center">
              <Tag className={`w-4 h-4 ${promo.active ? 'text-emerald-400' : 'text-muted-foreground'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-foreground">{promo.code}</span>
                <Badge className={`text-[10px] ${promo.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                  {promo.active ? 'Активен' : 'Неактивен'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                -{promo.discount}% · {promo.usages}/{promo.limit} использований · до {promo.expires}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground hover:bg-foreground/10"><Edit className="w-3.5 h-3.5" /></Button>
              <Button size="icon" variant="ghost" className="w-7 h-7 text-red-400 hover:bg-red-400/10"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Создать промокод</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Код (например, SAVE20)" />
            <Input type="number" placeholder="Скидка (%)" />
            <Input type="number" placeholder="Лимит использований" />
            <Input type="date" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Отмена</Button>
              <Button>Создать</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
