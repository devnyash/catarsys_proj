import { useState } from 'react';
import { Settings, Save, AlertTriangle, Check, Home } from "lucide-react";
import type { AdminTab } from "@/pages/AdminPage";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export default function SettingsTab({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const [commission, setCommission] = useState(15);
  const [minPrice, setMinPrice] = useState(50);
  const [autoModerate, setAutoModerate] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => onNavigate("home")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs">Главная</span>
      </Button>

      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Настройки платформы</h2>
      </div>

      {/* General Settings */}
      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 space-y-4">
        <h3 className="text-sm font-medium text-foreground">Основные</h3>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Комиссия (%)</p>
            <p className="text-xs text-muted-foreground">Процент, удерживаемый с каждой продажи</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={commission}
              onChange={e => setCommission(Number(e.target.value))}
              className="w-20 h-8 text-xs"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Минимальная цена</p>
            <p className="text-xs text-muted-foreground">Минимальная стоимость мода</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={minPrice}
              onChange={e => setMinPrice(Number(e.target.value))}
              className="w-20 h-8 text-xs"
            />
            <span className="text-sm text-muted-foreground">₡</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Авто-модерация</p>
            <p className="text-xs text-muted-foreground">Автоматически одобрять моды проверенных авторов</p>
          </div>
          <Switch checked={autoModerate} onCheckedChange={setAutoModerate} />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <h3 className="text-sm font-medium text-red-400">Опасная зона</h3>
        </div>
        <p className="text-xs text-muted-foreground">Эти действия нельзя отменить</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-red-400 border-red-400/20 hover:bg-red-400/10">
            Очистить кеш
          </Button>
          <Button variant="outline" size="sm" className="text-red-400 border-red-400/20 hover:bg-red-400/10">
            Сбросить статистику
          </Button>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} className="flex items-center gap-2">
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Сохранено!' : 'Сохранить'}
        </Button>
      </div>
    </div>
  );
}
