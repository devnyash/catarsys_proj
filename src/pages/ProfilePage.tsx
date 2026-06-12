import { motion } from 'framer-motion';
import {
  Edit3,
  Star,
  Download,
  ShoppingBag,
  Wallet,
  CheckCircle,

  Youtube,
  MessageCircle,
  Gamepad2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { mockMods } from '@/data/mock';
import ModCard from '@/components/mod/ModCard';

export default function ProfilePage() {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-zinc-500">Пожалуйста, войдите чтобы просмотреть профиль</p>
      </div>
    );
  }

  const userMods = mockMods.filter((m) => m.authorId === user.id);
  const userDownloads = userMods.reduce((sum, mod) => sum + mod.downloadsCount, 0);
  const userPurchases = userMods.reduce((sum, mod) => sum + (mod.price > 0 ? 1 : 0), 0);
  const userRating = userMods.reduce((sum, mod) => sum + mod.rating, 0) / userMods.length || 0;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full scrollbar-thin">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="relative">
            <img
              src={user.avatar}
              alt={user.displayName}
              className="w-20 h-20 rounded-2xl bg-foreground/10"
            />
            {user.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-zinc-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-foreground" />
              </div>
            )}
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
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="w-5 h-5"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M12 1.5l2.36 1.71 2.9-.13 1.06 2.7 2.42 1.6-.62 2.84.62 2.84-2.42 1.6-1.06 2.7-2.9-.13L12 22.5l-2.36-1.71-2.9.13-1.06-2.7-2.42-1.6.62-2.84-.62-2.84 2.42-1.6 1.06-2.7 2.9.13L12 1.5zm4.03 7.47a1 1 0 00-1.42-1.42l-4.36 4.36-1.86-1.86a1 1 0 10-1.42 1.42l2.57 2.57a1 1 0 001.42 0l5.07-5.07z"
                        />
                      </svg>
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
              onClick={() => useUIStore.getState().setCurrentPage('settings')}
              className="flex items-center gap-2 px-4 py-2 bg-foreground/[0.05] hover:bg-foreground/[0.08] border border-foreground/[0.08] rounded-lg text-xs text-zinc-300 hover:text-foreground transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Редактировать профиль
            </button>
          </div>

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
              value: `${user.balance.toLocaleString()} ₽`,
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
        {userMods.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {userMods.map((mod, i) => (
              <ModCard key={mod.id} mod={mod} index={i} />
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
    </div>
  );
}
