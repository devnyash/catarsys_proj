import { useState } from "react";
import { motion } from "framer-motion";
import { History, RotateCcw, Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AdminTab } from "@/pages/AdminPage";

const mockMods = [
  { id: 1, title: 'Ultimate Graphics 2.5' },
  { id: 2, title: 'Real Cars Pack' },
  { id: 3, title: 'Tactical Weapons Pack' },
];

const mockVersions = [
  { id: 1, modId: 1, version: '2.5.1', changes: 'Исправление багов с текстурами', date: '10.12.2024', isCurrent: true },
  { id: 2, modId: 1, version: '2.5.0', changes: 'Добавлена поддержка DLSS', date: '09.12.2024', isCurrent: false },
  { id: 3, modId: 1, version: '2.4.0', changes: 'Полный рефакторинг', date: '08.12.2024', isCurrent: false },
];

export default function VersionsTab({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const [selectedMod, setSelectedMod] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => onNavigate("home")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs">Главная</span>
      </Button>

      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Версии модов</h2>
      </div>

      {/* Mod Selector */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Выберите мод..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 text-sm bg-foreground/[0.02] border border-foreground/[0.06] rounded-lg"
        />
      </div>

      {/* Mods List */}
      <div className="space-y-2">
        {mockMods.filter(m => m.title.toLowerCase().includes(search.toLowerCase())).map(mod => (
          <button key={mod.id} onClick={() => setSelectedMod(mod.id)}
            className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
              selectedMod === mod.id ? 'border-foreground/20 bg-foreground/[0.04]' : 'border-foreground/[0.06] bg-foreground/[0.02] hover:bg-foreground/[0.04]'
            }`}>
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{mod.title}</span>
          </button>
        ))}
      </div>

      {/* Versions Timeline */}
      {selectedMod && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">История версий</h3>
          {mockVersions.filter(v => v.modId === selectedMod).map((version, i) => (
            <motion.div key={version.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${version.isCurrent ? 'bg-emerald-400/10' : 'bg-foreground/[0.05]'}`}>
                <span className={`text-xs font-bold ${version.isCurrent ? 'text-emerald-400' : 'text-muted-foreground'}`}>v{version.version}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">{version.changes}</p>
                <p className="text-xs text-muted-foreground">{version.date}</p>
              </div>
              {version.isCurrent && <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400">Текущая</Badge>}
              {!version.isCurrent && (
                <Button size="icon" variant="ghost" className="w-7 h-7 text-amber-400 hover:bg-amber-400/10"><RotateCcw className="w-3.5 h-3.5" /></Button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
