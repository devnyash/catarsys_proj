import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, MapPin, Home } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { AdminTab } from "@/pages/AdminPage";
import { Button } from "@/components/ui/button";

const mockGeoData = [
  { country: 'Россия', users: 1240, percentage: 78.5 },
  { country: 'Украина', users: 180, percentage: 11.4 },
  { country: 'Беларусь', users: 95, percentage: 6.0 },
  { country: 'Казахстан', users: 45, percentage: 2.8 },
  { country: 'Узбекистан', users: 12, percentage: 0.8 },
  { country: 'Другие', users: 8, percentage: 0.5 },
];

const topCities = [
  { city: 'Москва', users: 420 },
  { city: 'Санкт-Петербург', users: 180 },
  { city: 'Киев', users: 95 },
  { city: 'Минск', users: 72 },
  { city: 'Алматы', users: 38 },
];

export default function GeoTab({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const [period, setPeriod] = useState('30d');

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => onNavigate("home")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs">Главная</span>
      </Button>

      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">География пользователей</h2>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1">
        {[
          { id: '7d', label: '7 дней' },
          { id: '30d', label: '30 дней' },
          { id: '90d', label: '90 дней' },
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              period === p.id
                ? 'bg-foreground text-background'
                : 'bg-foreground/[0.05] text-muted-foreground hover:bg-foreground/[0.1]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Top Cities */}
      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">Топ городов</h3>
        <div className="space-y-2">
          {topCities.map((city, i) => (
            <div key={city.city} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm text-foreground flex-1">{city.city}</span>
              <span className="text-xs text-muted-foreground">{city.users}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Country Chart */}
      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">По странам</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mockGeoData} layout="vertical">
            <XAxis type="number" hide />
            <YAxis dataKey="country" type="category" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} width={80} />
            <Tooltip
              contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="users" fill="#818cf8" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Country List */}
      <div className="space-y-2">
        {mockGeoData.map((item, i) => (
          <motion.div
            key={item.country}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3"
          >
            <div className="w-8 h-8 rounded-lg bg-foreground/[0.05] flex items-center justify-center">
              <Globe className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.country}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-foreground/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-400 rounded-full"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{item.percentage}%</span>
              </div>
            </div>
            <span className="text-sm font-medium text-foreground">{item.users}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
