import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, Users, DollarSign, Package, Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { AdminTab } from "@/pages/AdminPage";

interface DashboardTabProps {
  stats: { total_users: number; total_mods: number; total_purchases: number; downloads_today: number; active_subscriptions: number; open_tickets: number; total_revenue: number } | null;
  isLoading: boolean;
  onNavigate: (tab: AdminTab) => void;
}

const mockRevenueData = [
  { day: 'Пн', value: 12500 },
  { day: 'Вт', value: 18300 },
  { day: 'Ср', value: 8700 },
  { day: 'Чт', value: 22100 },
  { day: 'Пт', value: 15600 },
  { day: 'Сб', value: 28400 },
  { day: 'Вс', value: 19800 },
];

const mockUserGrowth = [
  { day: 'Пн', value: 12 },
  { day: 'Вт', value: 8 },
  { day: 'Ср', value: 24 },
  { day: 'Чт', value: 16 },
  { day: 'Пт', value: 31 },
  { day: 'Сб', value: 45 },
  { day: 'Вс', value: 28 },
];

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  return (
    <div className="flex items-end gap-px h-6">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 bg-emerald-400/60 rounded-sm min-w-[2px]"
          style={{ height: `${((v - min) / range) * 100}%`, minHeight: 2 }}
        />
      ))}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, trend }: { label: string; value: number; icon: React.ElementType; trend?: number[] }) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 hover:bg-foreground/[0.04] transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <p className="text-xl font-bold text-foreground">{value.toLocaleString('ru-RU')}</p>
      {trend && <div className="mt-2"><Sparkline data={trend} /></div>}
    </div>
  );
}

export default function DashboardTab({ stats, isLoading, onNavigate }: DashboardTabProps) {
  const revenueData = useMemo(() => mockRevenueData, []);
  const userGrowth = useMemo(() => mockUserGrowth, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => onNavigate("home")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs">Главная</span>
      </Button>
      {/* Summary Banner */}
      <div className="rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-foreground/[0.06] p-4">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          <span className="text-sm text-foreground">Сегодня: +{stats?.downloads_today ?? 0} скачиваний, +{userGrowth[userGrowth.length - 1]?.value ?? 0} пользователей, доход {revenueData[revenueData.length - 1]?.value?.toLocaleString('ru-RU') ?? 0} ₡</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Пользователей" value={stats?.total_users ?? 0} icon={Users} trend={[45, 52, 48, 61, 55, 72, 68]} />
        <StatCard label="Модов всего" value={stats?.total_mods ?? 0} icon={Package} trend={[12, 18, 15, 22, 19, 28, 24]} />
        <StatCard label="Покупок" value={stats?.total_purchases ?? 0} icon={DollarSign} trend={[8, 12, 7, 15, 11, 18, 14]} />
        <StatCard label="На модерации" value={stats?.open_tickets ?? 0} icon={TrendingUp} trend={[3, 5, 2, 7, 4, 1, 6]} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Доход за неделю</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="value" stroke="#818cf8" fill="url(#revenueGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Новые пользователи</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={userGrowth}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="value" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
