import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Edit, Trash2, GripVertical, Search, Home } from "lucide-react";
import type { AdminTab } from "@/pages/AdminPage";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const mockCategories = [
  { id: 1, key: 'redux', label: 'Redux' },
  { id: 2, key: 'gun_pack', label: 'Gun Pack' },
  { id: 3, key: 'clothes', label: 'Clothes' },
  { id: 4, key: 'vehicle', label: 'Vehicle' },
  { id: 5, key: 'effects', label: 'Effects' },
  { id: 6, key: 'other', label: 'Other' },
];

const mockProjects = [
  { id: 1, key: 'gta5rp', label: 'GTA 5 RP' },
  { id: 2, key: 'majestic', label: 'Majestic' },
  { id: 3, key: 'universal', label: 'Universal' },
];

export default function CategoriesTab({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const [tab, setTab] = useState<'categories' | 'projects'>('categories');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const data = tab === 'categories' ? mockCategories : mockProjects;
  const filtered = data.filter(item => item.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => onNavigate("home")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs">Главная</span>
      </Button>

      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Категории и проекты</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        <button onClick={() => setTab('categories')} className={`px-3 py-1.5 text-xs rounded-lg ${tab === 'categories' ? 'bg-foreground text-background' : 'bg-foreground/[0.05] text-muted-foreground'}`}>
          Категории
        </button>
        <button onClick={() => setTab('projects')} className={`px-3 py-1.5 text-xs rounded-lg ${tab === 'projects' ? 'bg-foreground text-background' : 'bg-foreground/[0.05] text-muted-foreground'}`}>
          Проекты
        </button>
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
        {filtered.map((item, i) => (
          <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3">
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.key}</p>
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
          <DialogHeader><DialogTitle>Создать {tab === 'categories' ? 'категорию' : 'проект'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Название" />
            <Input placeholder="Ключ (латинскими буквами)" />
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
