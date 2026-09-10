import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  Loader2,
  RefreshCw,
  Command,
  Home,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { adminApi } from '@/api/admin';
import type { AdminStats, AdminUser, AdminPendingMod, AdminAllMod } from '@/api/admin';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import DashboardTab from '@/pages/DashboardTab';
import ModerationTab from '@/pages/ModerationTab';
import UsersTab from '@/pages/UsersTab';
import NotificationsTab from '@/pages/NotificationsTab';
import TransactionsTab from '@/pages/TransactionsTab';
import SystemHealthTab from '@/pages/SystemHealthTab';
import AdminHomePage from '@/pages/AdminHomePage';
import AdminCommandPalette from '@/pages/AdminCommandPalette';
import ReviewsTab from '@/pages/ReviewsTab';
import AuthorsTab from '@/pages/AuthorsTab';
import FinanceTab from '@/pages/FinanceTab';
import PayoutsTab from '@/pages/PayoutsTab';
import AnalyticsTab from '@/pages/AnalyticsTab';
import SecurityTab from '@/pages/SecurityTab';
import DisputesTab from '@/pages/DisputesTab';
import PromocodesTab from '@/pages/PromocodesTab';
import CategoriesTab from '@/pages/CategoriesTab';
import VersionsTab from '@/pages/VersionsTab';
import GeoTab from '@/pages/GeoTab';
import SettingsTab from '@/pages/SettingsTab';
import AuditTab from '@/pages/AuditTab';

export type AdminTab = 'home' | 'dashboard' | 'moderation' | 'mods' | 'users' | 'reviews' | 'authors' | 'finance' | 'payouts' | 'analytics' | 'notifications' | 'security' | 'disputes' | 'promocodes' | 'categories' | 'versions' | 'geo' | 'transactions' | 'system' | 'settings' | 'audit';

function errMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isSuperAdmin = user?.role === 'superadmin';

  const [tab, setTab] = useState<AdminTab>('home');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [queue, setQueue] = useState<AdminPendingMod[]>([]);
  const [loading, setLoading] = useState(false);
  const [allMods] = useState<AdminAllMod[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, modsRes] = await Promise.all([
        adminApi.getStats().catch(() => null),
        adminApi.listUsers({ limit: 100 }).catch(() => null),
        adminApi.listPendingMods({ limit: 100 }).catch(() => null),
      ]);
      if (statsRes) setStats(statsRes);
      if (usersRes) setUsers(usersRes.users || []);
      if (modsRes) setQueue(modsRes.mods || []);
    } catch (error) {
      toast.error(errMessage(error, 'Не удалось загрузить данные'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadAll();
  }, [isAdmin, loadAll]);

  // Cmd+K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!isAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-foreground/5 flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Доступ запрещён</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Админ-панель доступна только пользователям с ролью «Админ» или «Супер-админ».
        </p>
      </div>
    );
  }

  const pendingCount = stats?.pending_mods ?? stats?.mods_pending_count ?? queue.length;

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'home', label: 'Главная', icon: Home },
    { id: 'dashboard', label: 'Дашборд', icon: ShieldCheck },
    { id: 'moderation', label: 'Модерация', icon: ShieldCheck },
    { id: 'mods', label: 'Моды', icon: ShieldCheck },
    { id: 'users', label: 'Пользователи', icon: ShieldCheck },
    { id: 'notifications', label: 'Уведомления', icon: ShieldCheck },
    { id: 'analytics', label: 'Аналитика', icon: ShieldCheck },
    { id: 'finance', label: 'Финансы', icon: ShieldCheck },
    { id: 'system', label: 'Система', icon: ShieldCheck },
    ...(isSuperAdmin ? [{ id: 'audit' as AdminTab, label: 'Аудит', icon: ShieldCheck }] : []),
  ];

  const handleApprove = async (mod: AdminPendingMod) => {
    try {
      await adminApi.approveMod(mod.id);
      setQueue((prev) => prev.filter((m) => m.id !== mod.id));
      toast.success('Мод одобрен');
      adminApi.getStats().then(setStats).catch(() => {});
    } catch (error) {
      toast.error(errMessage(error, 'Не удалось одобрить'));
    }
  };

  const handleRejectOrBan = async (modId: number, reason: string, mode: 'reject' | 'ban') => {
    try {
      if (mode === 'reject') {
        await adminApi.rejectMod(modId, reason);
        toast.success('Мод отклонён');
      } else {
        await adminApi.banMod(modId, reason);
        toast.success('Мод забанен');
      }
      setQueue((prev) => prev.filter((m) => m.id !== modId));
    } catch (error) {
      toast.error(errMessage(error, 'Не удалось выполнить действие'));
    }
  };

  const handleBanUser = async (u: AdminUser) => {
    try {
      await adminApi.banUser(u.id, !u.is_banned);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_banned: !u.is_banned } : x)));
      toast.success(u.is_banned ? 'Пользователь разбанен' : 'Пользователь забанен');
    } catch (error) {
      toast.error(errMessage(error, 'Не удалось изменить статус'));
    }
  };

  const handleSetRole = async (u: AdminUser, role: 'user' | 'moderator' | 'admin') => {
    try {
      await adminApi.setUserRole(u.id, role);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
      toast.success('Роль обновлена');
    } catch (error) {
      toast.error(errMessage(error, 'Не удалось изменить роль'));
    }
  };

  const handleNavigate = (t: string) => setTab(t as AdminTab);
  const badgeColor = pendingCount > 10 ? 'bg-red-500' : pendingCount > 0 ? 'bg-amber-500' : 'bg-gray-500';

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6 rounded-xl bg-gradient-to-r from-foreground/[0.03] to-transparent p-4 border border-foreground/[0.06]"
      >
        <div className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Админ-панель</h1>
          <p className="text-xs text-muted-foreground">
            Управление платформой Catarsys
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-1.5"
        >
          <Command className="w-3.5 h-3.5" />
          <span className="text-xs">Cmd+K</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAll}
          disabled={loading}
          className="flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Обновить
        </Button>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-foreground/[0.06] overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <Button
              key={t.id}
              variant="ghost"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${
                active
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.id === 'moderation' && pendingCount > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white ${badgeColor}`}>
                  {pendingCount}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'home' && (
            <AdminHomePage
              stats={stats}
              pendingMods={pendingCount}
              onNavigate={handleNavigate}
              onSearch={() => {}}
            />
          )}

          {tab === 'dashboard' && (
            <DashboardTab
              stats={stats ? {
                total_users: stats.total_users ?? 0,
                total_mods: stats.total_mods ?? 0,
                total_purchases: stats.total_purchases ?? 0,
                downloads_today: stats.downloads_today ?? 0,
                active_subscriptions: stats.active_subscriptions ?? 0,
                open_tickets: stats.open_tickets ?? 0,
                total_revenue: stats.total_revenue ?? 0,
              } : null}
              isLoading={loading}
            />
          )}

          {tab === 'moderation' && (
            <ModerationTab
              queue={queue}
              onApprove={handleApprove}
              onReject={(id, reason) => handleRejectOrBan(id, reason, 'reject')}
              onBan={(id, reason) => handleRejectOrBan(id, reason, 'ban')}
              isLoading={loading}
            />
          )}

          {tab === 'users' && (
            <UsersTab
              users={users}
              onBan={handleBanUser}
              onSetRole={handleSetRole}
              isLoading={loading}
            />
          )}

          {tab === 'notifications' && (
            <NotificationsTab
              pendingMods={pendingCount}
              newUsers={0}
              openTickets={stats?.open_tickets ?? 0}
              onNavigate={handleNavigate}
            />
          )}

          {tab === 'transactions' && <TransactionsTab />}
          {tab === 'system' && <SystemHealthTab />}
          {tab === 'reviews' && <ReviewsTab />}
          {tab === 'authors' && <AuthorsTab />}
          {tab === 'finance' && <FinanceTab />}
          {tab === 'payouts' && <PayoutsTab />}
          {tab === 'analytics' && <AnalyticsTab />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'disputes' && <DisputesTab />}
          {tab === 'promocodes' && <PromocodesTab />}
          {tab === 'categories' && <CategoriesTab />}
          {tab === 'versions' && <VersionsTab />}
          {tab === 'geo' && <GeoTab />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'audit' && isSuperAdmin && <AuditTab />}

          {/* Placeholder tabs */}
          {['mods'].includes(tab) && (
            <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-1">Каталог модов</h3>
              <p className="text-sm text-muted-foreground">Раздел в разработке</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Command Palette */}
      <AdminCommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        onRefresh={loadAll}
        users={users.map(u => ({ id: u.id, username: u.username, email: u.email }))}
        mods={allMods.map(m => ({ id: m.id, title: m.title }))}
      />
    </div>
  );
}
