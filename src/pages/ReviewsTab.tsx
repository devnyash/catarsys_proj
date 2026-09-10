import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Eye, EyeOff, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const mockReviews = [
  { id: 1, username: 'player1', modTitle: 'Ultimate Graphics 2.5', rating: 5, text: 'Отличный мод, всё работает!', date: '2024-12-10', status: 'visible' },
  { id: 2, username: 'gamer2', modTitle: 'Real Cars Pack', rating: 4, text: 'Хороший мод, но есть баги', date: '2024-12-09', status: 'visible' },
  { id: 3, username: 'spammer', modTitle: 'Bad Mod', rating: 1, text: 'Купите мой мод по ссылке...', date: '2024-12-09', status: 'hidden' },
  { id: 4, username: 'user123', modTitle: 'Tactical Weapons', rating: 5, text: 'Лучший мод на оружие!', date: '2024-12-08', status: 'visible' },
];

export default function ReviewsTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = mockReviews.filter(r => {
    const matchSearch = r.modTitle.toLowerCase().includes(search.toLowerCase()) || r.username.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Модерация отзывов</h2>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <div className="flex gap-1">
          {['all', 'visible', 'hidden'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-xs rounded-lg ${statusFilter === s ? 'bg-foreground text-background' : 'bg-foreground/[0.05] text-muted-foreground'}`}>
              {s === 'all' ? 'Все' : s === 'visible' ? 'Видимые' : 'Скрытые'}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((review, i) => (
          <motion.div key={review.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{review.username}</span>
                  <span className="text-xs text-muted-foreground">→</span>
                  <span className="text-sm text-foreground">{review.modTitle}</span>
                  <Badge className={`text-[10px] ${review.status === 'visible' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {review.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star key={idx} className={`w-3 h-3 ${idx < review.rating ? 'text-amber-400 fill-amber-400' : 'text-foreground/20'}`} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">{review.text}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{review.date}</p>
              </div>
              <div className="flex gap-1">
                {review.status === 'visible' ? (
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-amber-400 hover:bg-amber-400/10"><EyeOff className="w-3.5 h-3.5" /></Button>
                ) : (
                  <Button size="icon" variant="ghost" className="w-7 h-7 text-emerald-400 hover:bg-emerald-400/10"><Eye className="w-3.5 h-3.5" /></Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
