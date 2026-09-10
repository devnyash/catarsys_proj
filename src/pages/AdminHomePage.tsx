import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardList, Users, Activity, Bell, History,
  Package, CreditCard, Tag, MessageSquare, UserCheck,
  DollarSign, BarChart3, FileText, Shield, Settings, Search,
  Gavel, Globe
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { AdminTab } from '@/pages/AdminPage';

interface AdminHomePageProps {
  stats: any;
  pendingMods: number;
  onNavigate: (tab: AdminTab) => void;
  onSearch: (query: string) => void;
}

const sections = [
  {
    id: 'moderation',
    title: 'Модерация',
    description: 'Проверка модов, отклонение, баны',
    icon: ClipboardList,
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
    borderColor: 'border-amber-400/20',
    badge: 'pending',
  },
  {
    id: 'mods',
    title: 'Каталог модов',
    description: 'Управление, закрепление, баннеры',
    icon: Package,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    borderColor: 'border-blue-400/20',
    badge: null,
  },
  {
    id: 'users',
    title: 'Пользователи',
    description: 'Управление, роли, балансы, баны',
    icon: Users,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
    borderColor: 'border-emerald-400/20',
    badge: null,
  },
  {
    id: 'reviews',
    title: 'Отзывы',
    description: 'Модерация отзывов, жалобы',
    icon: MessageSquare,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    borderColor: 'border-purple-400/20',
    badge: null,
  },
  {
    id: 'authors',
    title: 'Авторы',
    description: 'Профили, верификация, выплаты',
    icon: UserCheck,
    color: 'text-pink-400',
    bgColor: 'bg-pink-400/10',
    borderColor: 'border-pink-400/20',
    badge: null,
  },
  {
    id: 'finance',
    title: 'Финансы',
    description: 'Транзакции, промокоды, диспуты',
    icon: CreditCard,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    borderColor: 'border-yellow-400/20',
    badge: null,
  },
  {
    id: 'payouts',
    title: 'Выплаты',
    description: 'Запросы на вывод средств',
    icon: DollarSign,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    borderColor: 'border-orange-400/20',
    badge: null,
  },
  {
    id: 'analytics',
    title: 'Аналитика',
    description: 'Статистика, тренды, воронка',
    icon: BarChart3,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/20',
    badge: null,
  },
  {
    id: 'notifications',
    title: 'Уведомления',
    description: 'Центр уведомлений и оповещений',
    icon: Bell,
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
    borderColor: 'border-red-400/20',
    badge: 'urgent',
  },
  {
    id: 'security',
    title: 'Безопасность',
    description: 'Жалобы, подозрительная активность',
    icon: Shield,
    color: 'text-rose-400',
    bgColor: 'bg-rose-400/10',
    borderColor: 'border-rose-400/20',
    badge: null,
  },
  {
    id: 'disputes',
    title: 'Диспуты',
    description: 'Возвраты, жалобы на моды',
    icon: Gavel,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-400/10',
    borderColor: 'border-indigo-400/20',
    badge: null,
  },
  {
    id: 'promocodes',
    title: 'Промокоды',
    description: 'Создание и управление',
    icon: Tag,
    color: 'text-lime-400',
    bgColor: 'bg-lime-400/10',
    borderColor: 'border-lime-400/20',
    badge: null,
  },
  {
    id: 'categories',
    title: 'Категории',
    description: 'Категории и проекты',
    icon: FileText,
    color: 'text-teal-400',
    bgColor: 'bg-teal-400/10',
    borderColor: 'border-teal-400/20',
    badge: null,
  },
  {
    id: 'versions',
    title: 'Версии модов',
    description: 'История обновлений, откаты',
    icon: History,
    color: 'text-slate-400',
    bgColor: 'bg-slate-400/10',
    borderColor: 'border-slate-400/20',
    badge: null,
  },
  {
    id: 'geo',
    title: 'География',
    description: 'Откуда пользователи',
    icon: Globe,
    color: 'text-sky-400',
    bgColor: 'bg-sky-400/10',
    borderColor: 'border-sky-400/20',
    badge: null,
  },
  {
    id: 'system',
    title: 'Система',
    description: 'Статус сервисов, здоровье',
    icon: Activity,
    color: 'text-violet-400',
    bgColor: 'bg-violet-400/10',
    borderColor: 'border-violet-400/20',
    badge: null,
  },
  {
    id: 'settings',
    title: 'Настройки',
    description: 'Комиссия, авто-модерация',
    icon: Settings,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
    borderColor: 'border-gray-400/20',
    badge: null,
  },
];

export default function AdminHomePage({ stats, pendingMods, onNavigate, onSearch }: AdminHomePageProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = searchQuery
    ? sections.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sections;

  const quickStats = [
    { label: 'На модерации', value: pendingMods, color: 'text-amber-400' },
    { label: 'Пользователей', value: stats?.total_users ?? 0, color: 'text-emerald-400' },
    { label: 'Модов', value: stats?.total_mods ?? 0, color: 'text-blue-400' },
    { label: 'Доход', value: `${(stats?.total_revenue ?? 0).toLocaleString('ru-RU')} ₡`, color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по разделам админки..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value);
            onSearch(e.target.value);
          }}
          className="pl-10 h-12 bg-foreground/[0.02] border-foreground/[0.06]"
        />
      </div>

      {/* Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredSections.map((section, i) => (
          <motion.button
            key={section.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(section.id as AdminTab)}
            className={`relative flex flex-col items-start gap-3 rounded-xl border ${section.borderColor} ${section.bgColor} p-4 text-left transition-colors hover:bg-foreground/[0.06]`}
          >
            <div className={`w-10 h-10 rounded-lg ${section.bgColor} flex items-center justify-center`}>
              <section.icon className={`w-5 h-5 ${section.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{section.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
            </div>
            {section.badge === 'pending' && pendingMods > 0 && (
              <Badge className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5">
                {pendingMods}
              </Badge>
            )}
            {section.badge === 'urgent' && pendingMods > 5 && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            )}
          </motion.button>
        ))}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Раздел не найден</p>
        </div>
      )}
    </div>
  );
}
