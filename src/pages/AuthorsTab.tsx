import { useState } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, Search, BadgeCheck, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import UserAvatar from '@/components/ui/UserAvatar';

const mockAuthors = [
  { id: 1, username: 'devnyash', modCount: 12, totalSales: 15000, isVerified: true },
  { id: 2, username: 'modder1', modCount: 8, totalSales: 8500, isVerified: false },
  { id: 3, username: 'creator99', modCount: 15, totalSales: 22000, isVerified: true },
  { id: 4, username: 'newmodder', modCount: 2, totalSales: 500, isVerified: false },
];

export default function AuthorsTab() {
  const [search, setSearch] = useState('');
  const filtered = mockAuthors.filter(a => a.username.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Авторы модов</h2>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Поиск авторов..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
      </div>
      <div className="space-y-2">
        {filtered.map((author, i) => (
          <motion.div key={author.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3">
            <UserAvatar name={author.username} className="w-10 h-10 !rounded-lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{author.username}</p>
                {author.isVerified && <BadgeCheck className="w-4 h-4 text-blue-400" />}
              </div>
              <p className="text-xs text-muted-foreground">{author.modCount} модов · {author.totalSales.toLocaleString()} ₡ продаж</p>
            </div>
            <div className="flex gap-1">
              {!author.isVerified && (
                <Button size="sm" variant="outline" className="text-xs">Верифицировать</Button>
              )}
              <Button size="icon" variant="ghost" className="w-8 h-8 text-muted-foreground"><ExternalLink className="w-4 h-4" /></Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
