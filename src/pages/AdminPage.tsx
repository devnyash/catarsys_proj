import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ShieldCheck,
  LayoutDashboard,
  ClipboardList,
  Users,
  Check,
  X,
  Ban,
  Lock,
  Loader2,
  RefreshCw,
  Wallet,
  Gamepad2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { adminApi } from '@/api/admin';
import type { AdminStats, AdminUser, AdminPendingMod, AdminUserPurchase } from '@/api/admin';
import { ApiError } from '@/api/client';
import UserAvatar from '@/components/ui/UserAvatar';

const cardIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
};

type AdminTab = 'dashboard' | 'moderation' | 'users';
type AssignableRole = 'user' | 'moderator' | 'admin';

const roleLabels: Record<string, string> = {
  user: 'Пользователь',
  moderator: 'Модератор',
  admin: 'Админ',
  superadmin: 'Супер-админ',
};

const assignableRoles: AssignableRole[] = ['user', 'moderator', 'admin'];

function errMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message || fallback;
  return fallback;
}

export default function AdminPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [queue, setQueue] = useState<AdminPendingMod[]>([]);
  const [loading, setLoading] = useState(false);

  const [reason, setReason] = useState('');
  const [reasonTarget, setReasonTarget] = useState<
    { modId: number; mode: 'reject' | 'ban'; title: string } | null
  >(null);

  // User management state
  const [manageUser, setManageUser] = useState<AdminUser | null>(null);
  const [userPurchases, setUserPurchases] = useState<AdminUserPurchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [grantModId, setGrantModId] = useState('');
  const [grantModAmount, setGrantModAmount] = useState('0');

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

  if (!isAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-foreground/5 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Доступ запрещён</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Админ-панель доступна только пользователям с ролью «Админ» или «Супер-админ».
        </p>
      </div>
    );
  }

  const pendingCount = stats?.pending_mods ?? stats?.mods_pending_count ?? queue.length;

  const statCards = [
    { label: 'Пользователей', value: stats?.total_users ?? 0 },
    { label: 'Модов всего', value: stats?.total_mods ?? 0 },
    { label: 'На модерации', value: pendingCount },
    { label: 'Покупок', value: stats?.total_purchases ?? 0 },
    { label: 'Скачиваний сегодня', value: stats?.downloads_today ?? 0 },
    { label: 'Активных подписок', value: stats?.active_subscriptions ?? 0 },
    { label: 'Открытых тикетов', value: stats?.open_tickets ?? 0 },
  ];

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Дашборд', icon: LayoutDashboard },
    { id: 'moderation', label: 'Модерация', icon: ClipboardList },
    { id: 'users', label: 'Пользователи', icon: Users },
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

  const openReason = (modId: number, mode: 'reject' | 'ban', title: string) => {
    setReasonTarget({ modId, mode, title });
    setReason('');
  };

  const confirmReason = async () => {
    if (!reasonTarget) return;
    if (reason.trim().length < 10) {
      toast.error('Причина должна содержать минимум 10 символов');
      return;
    }
    const { modId, mode } = reasonTarget;
    try {
      if (mode === 'reject') {
        await adminApi.rejectMod(modId, reason.trim());
        toast.success('Мод отклонён');
      } else {
        await adminApi.banMod(modId, reason.trim());
        toast.success('Мод забанен');
      }
      setQueue((prev) => prev.filter((m) => m.id !== modId));
      setReasonTarget(null);
      setReason('');
    } catch (error) {
      toast.error(errMessage(error, 'Не удалось выполнить действие'));
    }
  };

  const handleRole = async (u: AdminUser, role: AssignableRole) => {
    try {
      await adminApi.setUserRole(u.id, role);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role } : x)));
      toast.success('Роль обновлена');
    } catch (error) {
      toast.error(errMessage(error, 'Не удалось изменить роль'));
    }
  };

  const handleBan = async (u: AdminUser) => {
    try {
      await adminApi.banUser(u.id, !u.is_banned);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_banned: !u.is_banned } : x)));
      toast.success(u.is_banned ? 'Пользователь разбанен' : 'Пользователь забанен');
    } catch (error) {
      toast.error(errMessage(error, 'Не удалось изменить статус'));
    }
  };

  const openManageUser = async (u: AdminUser) => {
    setManageUser(u);
    setBalanceInput(String(u.balance));
    setGrantModId('');
    setGrantModAmount('0');
    setPurchasesLoading(true);
    try {
      const res = await adminApi.listUserPurchases(u.id);
      setUserPurchases(res.purchases || []);
    } catch {
      setUserPurchases([]);
    } finally {
      setPurchasesLoading(false);
    }
  };

  const handleSetBalance = async () => {
    if (!manageUser) return;
    const val = parseFloat(balanceInput);
    if (isNaN(val) || val < 0) {
      toast.error('Введите корректный баланс');
      return;
    }
    try {
      await adminApi.setUserBalance(manageUser.id, val);
      setUsers((prev) => prev.map((x) => (x.id === manageUser.id ? { ...x, balance: val } : x)));
      setManageUser((prev) => prev ? { ...prev, balance: val } : null);
      toast.success('Баланс обновлён');
    } catch (error) {
      toast.error(errMessage(error, 'Не удалось обновить баланс'));
    }
  };

  const handleGrantAccess = async () => {
    if (!manageUser) return;
    const mid = parseInt(grantModId);
    if (isNaN(mid) || mid <= 0) {
      toast.error('Введите ID мода');
      return;
    }
    const amt = parseFloat(grantModAmount) || 0;
    try {
      await adminApi.grantModAccess(manageUser.id, mid, amt);
      toast.success('Доступ выдан');
      const res = await adminApi.listUserPurchases(manageUser.id);
      setUserPurchases(res.purchases || []);
      setGrantModId('');
      setGrantModAmount('0');
    } catch (error) {
      toast.error(errMessage(error, 'Не удалось выдать доступ'));
    }
  };

  const handleRevokeAccess = async (p: AdminUserPurchase) => {
    if (!manageUser) return;
    if (!confirm(`Отозвать доступ к моду "${p.modTitle}"?`)) return;
    try {
      await adminApi.revokeModAccess(manageUser.id, p.modId);
      toast.success('Доступ отозван');
      const res = await adminApi.listUserPurchases(manageUser.id);
      setUserPurchases(res.purchases || []);
    } catch (error) {
      toast.error(errMessage(error, 'Не удалось отозвать доступ'));
    }
  };

  return (
    <div className="h-full overflow-y-auto px-8 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-foreground">Админ-панель</h1>
          <p className="text-xs text-muted-foreground">
            Управление пользователями, модерация и статистика
          </p>
        </div>
        <button
          onClick={loadAll}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-foreground/15 text-xs text-foreground hover:bg-foreground/5 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Обновить
        </button>
      </div>

      <div className="flex items-center gap-1 mb-6 border-b border-foreground/[0.06]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ' +
                (active
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground')
              }
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {t.id === 'moderation' && queue.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-foreground text-background">
                  {queue.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && (
        <motion.div {...cardIn} className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {statCards.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4"
              >
                <p className="text-2xl font-bold text-foreground">
                  {typeof s.value === 'number' ? s.value.toLocaleString('ru-RU') : s.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
            <p className="text-2xl font-bold text-foreground">
              {(stats?.total_revenue ?? 0).toLocaleString('ru-RU')} ₡
            </p>
            <p className="text-xs text-muted-foreground mt-1">Суммарный доход</p>
          </div>
        </motion.div>
      )}

      {tab === 'moderation' && (
        <motion.div {...cardIn} className="space-y-3">
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Очередь модерации пуста.</p>
          ) : (
            queue.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center gap-4 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{mod.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {mod.author_username ? '@' + mod.author_username : 'Автор #' + (mod.author_id ?? '?')}
                    {mod.category ? ' · ' + mod.category : ''} ·{' '}
                    {mod.price > 0 ? mod.price + ' ₡' : 'Бесплатно'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(mod)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-medium hover:opacity-90"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Одобрить
                  </button>
                  <button
                    onClick={() => openReason(mod.id, 'reject', mod.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-foreground/15 text-foreground text-xs font-medium hover:bg-foreground/5"
                  >
                    <X className="w-3.5 h-3.5" />
                    Отклонить
                  </button>
                  <button
                    onClick={() => openReason(mod.id, 'ban', mod.title)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-foreground/15 text-muted-foreground text-xs font-medium hover:bg-foreground/5"
                    title="Забанить"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </motion.div>
      )}

      {tab === 'users' && (
        <motion.div {...cardIn} className="space-y-2">
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет пользователей.</p>
          ) : (
            users.map((u) => {
              const canEdit = u.role !== 'superadmin';
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3"
                >
                  <UserAvatar name={u.username} src={u.avatar_url} className="w-10 h-10 text-sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground truncate">@{u.username}</p>
                      {u.is_banned && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/10 text-muted-foreground">
                          Забанен
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground hidden md:block mr-1">
                    {u.balance.toLocaleString('ru-RU')} ₡
                  </span>
                  {canEdit ? (
                    <select
                      value={assignableRoles.includes(u.role as AssignableRole) ? u.role : 'user'}
                      onChange={(e) => handleRole(u, e.target.value as AssignableRole)}
                      className="text-xs bg-background border border-foreground/15 rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:border-foreground/40"
                    >
                      {assignableRoles.map((r) => (
                        <option key={r} value={r}>
                          {roleLabels[r]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs px-2 py-1.5 rounded-lg bg-foreground/5 text-muted-foreground">
                      {roleLabels[u.role] || u.role}
                    </span>
                  )}
                  {canEdit && (
                    <>
                      <button
                        onClick={() => handleBan(u)}
                        className="px-2.5 py-1.5 rounded-lg border border-foreground/15 text-xs text-foreground hover:bg-foreground/5"
                      >
                        {u.is_banned ? 'Разбан' : 'Бан'}
                      </button>
                      <button
                        onClick={() => openManageUser(u)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-foreground/10 text-xs text-foreground hover:bg-foreground/20"
                      >
                        <Wallet className="w-3 h-3" />
                        Управление
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </motion.div>
      )}

      {/* User Management Modal */}
      {manageUser && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setManageUser(null)}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl border border-foreground/10 bg-background p-5 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <UserAvatar name={manageUser.username} src={manageUser.avatar_url} className="w-10 h-10 text-sm" />
              <div>
                <h3 className="text-base font-semibold text-foreground">@{manageUser.username}</h3>
                <p className="text-xs text-muted-foreground">{manageUser.email}</p>
              </div>
            </div>

            {/* Balance */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium">Баланс</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  className="flex-1 text-sm bg-foreground/[0.03] border border-foreground/15 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-foreground/40"
                />
                <button
                  onClick={handleSetBalance}
                  className="px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
                >
                  Установить
                </button>
              </div>
            </div>

            {/* Grant Access */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium">Выдать доступ к моду</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="ID мода"
                  value={grantModId}
                  onChange={(e) => setGrantModId(e.target.value)}
                  className="flex-1 text-sm bg-foreground/[0.03] border border-foreground/15 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-foreground/40"
                />
                <input
                  type="number"
                  placeholder="Цена"
                  value={grantModAmount}
                  onChange={(e) => setGrantModAmount(e.target.value)}
                  className="w-20 text-sm bg-foreground/[0.03] border border-foreground/15 rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-foreground/40"
                />
                <button
                  onClick={handleGrantAccess}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Выдать
                </button>
              </div>
            </div>

            {/* Purchases List */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-medium">Доступные моды</label>
              {purchasesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : userPurchases.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Нет доступных модов</p>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {userPurchases.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] px-3 py-2"
                    >
                      <Gamepad2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-xs text-foreground truncate">{p.modTitle}</span>
                      <span className="text-[10px] text-muted-foreground">{p.amount} ₡</span>
                      <button
                        onClick={() => handleRevokeAccess(p)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        title="Отозвать доступ"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setManageUser(null)}
              className="w-full py-2 rounded-lg border border-foreground/15 text-sm text-muted-foreground hover:text-foreground"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {reasonTarget && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          onClick={() => setReasonTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-foreground/10 bg-background p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-foreground">
              {reasonTarget.mode === 'reject' ? 'Отклонить мод' : 'Забанить мод'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 mb-3 truncate">{reasonTarget.title}</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Укажите причину (мин. 10 символов)…"
              className="w-full text-sm bg-foreground/[0.03] border border-foreground/15 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setReasonTarget(null)}
                className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground"
              >
                Отмена
              </button>
              <button
                onClick={confirmReason}
                className="px-3 py-1.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
