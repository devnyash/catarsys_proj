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
              className="w-20 h-20 rounded-2xl bg-zinc-800"
            />
            {user.isVerified && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-sky-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {user.displayName}
              </h1>
              {user.isVerified && (
                <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 text-[9px] font-bold uppercase tracking-wider rounded">
                  Подтвержден
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">@{user.username}</p>

            <div className="flex items-center gap-4 mt-3">
              <div className="text-center">
                <p className="text-lg font-bold text-white">
                  {user.followersCount}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Подписчики
                </p>
              </div>
              <div className="w-px h-8 bg-white/[0.08]" />
              <div className="text-center">
                <p className="text-lg font-bold text-white">
                  {user.followingCount}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Подписки
                </p>
              </div>
              <div className="w-px h-8 bg-white/[0.08]" />
              <div className="text-center">
                <p className="text-lg font-bold text-white">
                  {userMods.length}
                </p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Моды
                </p>
              </div>
            </div>
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-xs text-zinc-300 hover:text-white transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
            Редактировать профиль
          </button>
        </div>

        {/* Socials */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.06]">
          {user.socials.telegram && (
            <a
              href="#"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] rounded-lg text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {user.socials.telegram}
            </a>
          )}
          {user.socials.discord && (
            <a
              href="#"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] rounded-lg text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              {user.socials.discord}
            </a>
          )}
          {user.socials.youtube && (
            <a
              href="#"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] rounded-lg text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <Youtube className="w-3.5 h-3.5" />
              {user.socials.youtube}
            </a>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Баланс',
            value: `${user.balance.toLocaleString()} ₽`,
            icon: Wallet,
            color: 'text-emerald-400',
          },
          {
            label: 'Загрузки',
            value: '1.2k',
            icon: Download,
            color: 'text-sky-400',
          },
          {
            label: 'Покупки',
            value: '24',
            icon: ShoppingBag,
            color: 'text-rose-400',
          },
          {
            label: 'Рейтинг',
            value: '4.8',
            icon: Star,
            color: 'text-amber-400',
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
            <p className="text-lg font-bold text-white">{stat.value}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>

      {/* My Mods */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3">Мои моды</h2>
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
