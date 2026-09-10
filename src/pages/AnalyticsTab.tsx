import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3 } from "lucide-react";

const topMods = [
  { name: 'Ultimate Graphics', sales: 245 },
  { name: 'Real Cars Pack', sales: 189 },
  { name: 'Tactical Weapons', sales: 156 },
  { name: 'Drift Cars', sales: 134 },
  { name: 'LA Roads', sales: 98 },
];

const categoryData = [
  { name: 'Redux', value: 35, color: '#818cf8' },
  { name: 'Gun Pack', value: 25, color: '#34d399' },
  { name: 'Clothes', value: 20, color: '#fbbf24' },
  { name: 'Vehicle', value: 15, color: '#f87171' },
  { name: 'Effects', value: 5, color: '#a78bfa' },
];

export default function AnalyticsTab() {
  const [period, setPeriod] = useState('30d');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Аналитика</h2>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1">
        {[
          { id: '7d', label: '7 дней' },
          { id: '30d', label: '30 дней' },
          { id: '90d', label: '90 дней' },
        ].map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`px-3 py-1.5 text-xs rounded-lg ${period === p.id ? 'bg-foreground text-background' : 'bg-foreground/[0.05] text-muted-foreground'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Топ модов по продажам</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={topMods}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="sales" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">По категориям</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                {categoryData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {categoryData.map(cat => (
              <div key={cat.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-[10px] text-muted-foreground">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Retention */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3 text-center">
          <p className="text-xs text-muted-foreground">День 1</p>
          <p className="text-lg font-bold text-foreground">72%</p>
        </div>
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3 text-center">
          <p className="text-xs text-muted-foreground">День 7</p>
          <p className="text-lg font-bold text-foreground">45%</p>
        </div>
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3 text-center">
          <p className="text-xs text-muted-foreground">День 30</p>
          <p className="text-lg font-bold text-foreground">28%</p>
        </div>
      </div>
    </div>
  );
}
