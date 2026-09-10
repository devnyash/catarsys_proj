import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, Users, Package, CreditCard, Shield, Settings,
  FileText, Tag, MessageSquare, UserCheck, Activity,
  Globe, Bell, TrendingUp, DollarSign, Gavel, Search,
  Plus, Megaphone, Eye, History, Server, Database
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { AdminTab } from "@/pages/AdminPage";

interface AdminHomePageProps {
  onNavigate: (tab: AdminTab) => void;
}

interface SectionItem {
  label: string;
  tab: AdminTab;
  icon: LucideIcon;
}

interface Section {
  id: string;
  title: string;
  icon: LucideIcon;
  badge: string;
  items: SectionItem[];
}

const sections: Section[] = [
  {
    id: 'analytics',
    title: 'Аналитика',
    icon: BarChart3,
    badge: '4',
    items: [
      { label: 'Статистика', tab: 'dashboard', icon: TrendingUp },
      { label: 'Доходы', tab: 'finance', icon: DollarSign },
      { label: 'Продажи', tab: 'analytics', icon: BarChart3 },
      { label: 'География', tab: 'geo', icon: Globe },
    ],
  },
  {
    id: 'users',
    title: 'Пользователи',
    icon: Users,
    badge: '4',
    items: [
      { label: 'Все пользователи', tab: 'users', icon: Users },
      { label: 'Авторы', tab: 'authors', icon: UserCheck },
      { label: 'Модерация отзывов', tab: 'reviews', icon: MessageSquare },
      { label: 'Безопасность', tab: 'security', icon: Shield },
    ],
  },
  {
    id: 'content',
    title: 'Контент',
    icon: Package,
    badge: '4',
    items: [
      { label: 'Модерация модов', tab: 'moderation', icon: Eye },
      { label: 'Каталог модов', tab: 'mods', icon: Package },
      { label: 'Категории', tab: 'categories', icon: FileText },
      { label: 'Версии', tab: 'versions', icon: History },
    ],
  },
  {
    id: 'finance',
    title: 'Финансы',
    icon: CreditCard,
    badge: '4',
    items: [
      { label: 'Транзакции', tab: 'transactions', icon: Activity },
      { label: 'Выплаты', tab: 'payouts', icon: DollarSign },
      { label: 'Промокоды', tab: 'promocodes', icon: Tag },
      { label: 'Диспуты', tab: 'disputes', icon: Gavel },
    ],
  },
  {
    id: 'engagement',
    title: 'Вовлечение',
    icon: Megaphone,
    badge: '4',
    items: [
      { label: 'Уведомления', tab: 'notifications', icon: Bell },
      { label: 'Рассылки', tab: 'notifications', icon: Plus },
      { label: 'Акции', tab: 'promocodes', icon: Tag },
      { label: 'Закреплённые', tab: 'moderation', icon: Package },
    ],
  },
  {
    id: 'system',
    title: 'Система',
    icon: Settings,
    badge: '4',
    items: [
      { label: 'Здоровье системы', tab: 'system', icon: Server },
      { label: 'Настройки', tab: 'settings', icon: Settings },
      { label: 'Аудит', tab: 'audit', icon: Shield },
      { label: 'Логи', tab: 'audit', icon: Database },
    ],
  },
];

export default function AdminHomePage({ onNavigate }: AdminHomePageProps) {
  const [search, setSearch] = useState('');

  const filteredSections = search
    ? sections.map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.label.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter(section => section.items.length > 0)
    : sections;

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Поиск по разделам админки..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-12 h-14 bg-foreground/[0.02] border-foreground/[0.06] text-base"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSections.map((section, i) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] overflow-hidden hover:bg-foreground/[0.04] transition-colors"
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-foreground/[0.06]">
              <div className="w-10 h-10 rounded-xl bg-foreground/[0.05] flex items-center justify-center">
                <section.icon className="w-5 h-5 text-foreground/80" />
              </div>
              <div className="flex-1">
                <p className="text-base font-semibold text-foreground">{section.title}</p>
              </div>
              <span className="text-xs font-medium text-muted-foreground bg-foreground/[0.05] px-2 py-1 rounded-lg">
                {section.badge}
              </span>
            </div>

            {/* Items */}
            <div className="p-2">
              {section.items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onNavigate(item.tab)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-foreground/[0.04] transition-colors"
                >
                  <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground/90">{item.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-16">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Раздел не найден</p>
        </div>
      )}
    </div>
  );
}
