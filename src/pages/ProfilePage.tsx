import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Edit3,
  Star,
  Download,
  ShoppingBag,
  Wallet,
  BadgeCheck,

  Youtube,
  MessageCircle,
  Gamepad2,
  Pencil,
  Trash2,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { modsApi } from '@/api/mods';
import ModCard from '@/components/mod/ModCard';
import EditProfileModal from '@/components/profile/EditProfileModal';
import PublishModModal from '@/components/mod/PublishModModal';
import DeleteModModal from '@/components/mod/DeleteModModal';
import UserAvatar from '@/components/ui/UserAvatar';
import type { Mod } from '@/types';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [editOpen, setEditOpen] = useState(false);
  const [userMods, setUserMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMod, setEditMod] = useState<Mod | null>(null);
  const [deleteMod, setDeleteMod] = useState<Mod | null>(null);

  const fetchMods = async () => {
    setLoading(true);
    try {
      const res = await modsApi.getMyMods();
      setUserMods(res.mods || []);
    } catch {
      // silently fall back to empty
      setUserMods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMods();
  }, []);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500">Пожалуйста, войдите чтобы просмотреть профиль</p>
      </div>
    );
  }

  const userDownloads = userMods.reduce((sum, mod) => sum + (mod.downloadsCount || 0), 0);
  const userPurchases = userMods.filter((m) => (m.price || 0) > 0).length;
  const userRating = userMods.reduce((sum, mod) => sum + (mod.rating || 0), 0) / (userMods.length || 1);

  return (
    <div className="px-6 pb-6 pt-1 space-y-6 overflow-y-auto h-full scrollbar-thin">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-start gap-4">
          <div className="relative">
            <UserAvatar
              name={user.displayName || user.username}
              src={user.avatar}
              className="w-20 h-20 !rounded-2xl text-2xl"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">
                {user.displayName}
              </h1>
              {user.isVerified && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      role="img"
                      aria-label="Личность подтверждена"
                      className="inline-flex items-center justify-center text-foreground cursor-default"
                    >
                      <BadgeCheck className="w-5 h-5" aria-hidden="true" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Личность подтверждена</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">@{user.username}</p>

            <div className="flex items-center gap-4 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {user.followersCount}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Подписчики
                </p>
              </div>
              <div className="w-px h-8 bg-foreground/[0.08]" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {user.followingCount}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Подписки
                </p>
              </div>
              <div className="w-px h-8 bg-foreground/[0.08]" />
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">
                  {userMods.length}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Моды
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-foreground/[0.05] hover:bg-foreground/[0.08] border border-foreground/[0.08] rounded-lg text-xs text-zinc-300 hover:text-foreground transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Редактировать профиль
          </button>
        </div>

        <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />

        {/* Socials */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-foreground/[0.06]">
          {user.socials.telegram && (
            <a
              href="#"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground/[0.03] rounded-lg text-xs text-zinc-400 hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {user.socials.telegram}
            </a>
          )}
          {user.socials.discord && (
            <a
              href="#"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground/[0.03] rounded-lg text-xs text-zinc-400 hover:text-foreground transition-colors"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              {user.socials.discord}
            </a>
          )}
          {user.socials.youtube && (
            <a
              href="#"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground/[0.03] rounded-lg text-xs text-zinc-400 hover:text-foreground transition-colors"
            >
              <Youtube className="w-3.5 h-3.5" />
              {user.socials.youtube}
            </a>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {
          [
            {
              label: 'Баланс',
              value: `${user.balance.toLocaleString()} ₡`,
              icon: Wallet,
              color: 'text-zinc-400',
            },
            {
              label: 'Загрузки',
              value: userDownloads.toLocaleString(),
              icon: Download,
              color: 'text-zinc-400',
            },
            {
              label: 'Покупки',
              value: userPurchases.toString(),
              icon: ShoppingBag,
              color: 'text-zinc-400',
            },
            {
              label: 'Рейтинг',
              value: userRating.toFixed(1),
              icon: Star,
              color: 'text-zinc-400',
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-4"
            >
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {stat.label}
              </p>
            </motion.div>
          ))
        }
      </div>

      {/* My Mods */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Мои моды</h2>
        {loading ? (
          <div className="glass-card p-8 text-center">
            <Loader2 className="w-8 h-8 text-zinc-500 mx-auto mb-2 animate-spin" />
            <p className="text-sm text-zinc-500">Загрузка модов...</p>
          </div>
        ) : userMods.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {userMods.map((mod, i) => (
              <div key={mod.id} className="relative group">
                <ModCard mod={mod} index={i} />
                {/* Owner actions */}
                <div className="absolute top-2 left-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {mod.status === 'archived' ? (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await modsApi.restore(mod.id);
                          fetchMods();
                        } catch {
                          // silent
                        }
                      }}
                      className="p-2 bg-black/70 hover:bg-emerald-500/80 backdrop-blur-sm rounded-lg text-zinc-300 hover:text-foreground transition-colors"
                      title="Восстановить"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditMod(mod);
                      }}
                      className="p-2 bg-black/70 hover:bg-black/90 backdrop-blur-sm rounded-lg text-zinc-300 hover:text-foreground transition-colors"
                      title="Редактировать"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteMod(mod);
                    }}
                    className="p-2 bg-black/70 hover:bg-red-500/80 backdrop-blur-sm rounded-lg text-zinc-300 hover:text-foreground transition-colors"
                    title={mod.status === 'archived' ? 'Удалить полностью' : 'Удалить'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <Gamepad2 className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">
              Вы еще не опубликовали ни одного мода
            </p>
          </div>
        )}
      </div>

      {/* Edit Mod Modal */}
      <PublishModModal
        editMod={editMod ?? undefined}
        onEditClose={() => {
          setEditMod(null);
          fetchMods();
        }}
      />

      {/* Delete Mod Modal */}
      <DeleteModModal
        modId={deleteMod?.id ?? 0}
        modTitle={deleteMod?.title ?? ''}
        open={!!deleteMod}
        onClose={() => setDeleteMod(null)}
        onDeleted={fetchMods}
      />
    </div>
  );
}