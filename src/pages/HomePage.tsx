import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  Clock,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { useModStore } from '@/store/modStore';
import { categoryLabels, projectLabels } from '@/data/mock';
import ModCard from '@/components/mod/ModCard';
import type { ModCategory, ModProject } from '@/types';

const sortOptions = [
  { id: 'popular' as const, label: 'Популярные', icon: TrendingUp },
  { id: 'newest' as const, label: 'Новые', icon: Clock },
  { id: 'price_asc' as const, label: 'Цена: по возрастанию', icon: ArrowUpDown },
  { id: 'price_desc' as const, label: 'Цена: по убыванию', icon: ArrowUpDown },
];

export default function HomePage() {
  const { filters, setFilters, getFilteredMods } = useModStore();
  const [showFilters, setShowFilters] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);

  const filteredMods = getFilteredMods();
  const pinnedMods = filteredMods.filter((m) => m.isPinned);
  const regularMods = filteredMods.filter((m) => !m.isPinned);

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    setFilters({ search: value });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Hero Banner */}
      {pinnedMods.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-800 to-stone-950 border border-foreground/[0.08]"
        >
          <div className="flex flex-col md:flex-row">
            <div className="md:w-2/5 relative">
              <img
                src="/images/hero-car.jpg"
                alt="Избранное"
                className="w-full h-48 md:h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-stone-950/80 hidden md:block" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 to-transparent md:hidden" />
            </div>
            <div className="md:w-3/5 p-5 md:p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-zinc-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Избранное
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                Ultimate Graphics 2.5
              </h2>
              <p className="text-sm text-zinc-400 mt-1.5">
                Визуальная буря приближается. Трассировка лучей, поддержка DLSS, до 30% прироста FPS.
              </p>
              <div className="flex items-center gap-2 mt-3">
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-pulse" />
                    Обнаружение пройдено
                  </span>
                  <span className="text-xs text-zinc-600">|</span>
                  <span className="text-xs text-zinc-500">
                    Совместимо с последней версией сервера
                </span>
              </div>
              <div className="flex gap-2 mt-4">
                <button className="btn-primary text-xs px-4 py-2">
                  Обновить
                </button>
                <button className="btn-ghost text-xs px-4 py-2">
                  Скачать сейчас
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Поиск модов, авторов, категорий..."
              value={localSearch}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-10 bg-foreground/[0.03] border border-foreground/[0.08] rounded-lg pl-10 pr-4 text-sm text-foreground placeholder:text-zinc-600 outline-none focus:border-zinc-500/50 transition-colors"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 h-10 rounded-lg border text-sm transition-colors ${
              showFilters
                ? 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400'
                : 'bg-foreground/[0.03] border-foreground/[0.08] text-zinc-400 hover:text-foreground'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Фильтры</span>
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 space-y-3"
          >
            {/* Categories */}
            <div>
              <span className="text-xs text-zinc-500 mb-2 block">Категория</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilters({ category: 'all' })}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    filters.category === 'all'
                      ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                      : 'bg-foreground/[0.03] text-zinc-400 border border-foreground/[0.06] hover:bg-foreground/[0.06]'
                  }`}
                >
                  Все
                </button>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilters({ category: key as ModCategory })}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      filters.category === key
                        ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                        : 'bg-foreground/[0.03] text-zinc-400 border border-foreground/[0.06] hover:bg-foreground/[0.06]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div>
              <span className="text-xs text-zinc-500 mb-2 block">Проект</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFilters({ project: 'all' })}
                  className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                    filters.project === 'all'
                      ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                      : 'bg-foreground/[0.03] text-zinc-400 border border-foreground/[0.06] hover:bg-foreground/[0.06]'
                  }`}
                >
                  Все проекты
                </button>
                {Object.entries(projectLabels).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setFilters({ project: key as ModProject })}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      filters.project === key
                        ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                        : 'bg-foreground/[0.03] text-zinc-400 border border-foreground/[0.06] hover:bg-foreground/[0.06]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <span className="text-xs text-zinc-500 mb-2 block">Цена</span>
              <div className="flex gap-1.5">
                {[
                  { id: 'all', label: 'Все' },
                  { id: 'free', label: 'Бесплатные' },
                  { id: 'paid', label: 'Платные' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() =>
                      setFilters({
                        priceRange: option.id as 'all' | 'free' | 'paid',
                      })
                    }
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                      filters.priceRange === option.id
                        ? 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                        : 'bg-foreground/[0.03] text-zinc-400 border border-foreground/[0.06] hover:bg-foreground/[0.06]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Sort Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {filters.category === 'all' ? 'Все моды' : categoryLabels[filters.category]}
        </h2>
        <div className="flex items-center gap-1 bg-foreground/[0.03] rounded-lg p-0.5">
          {sortOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setFilters({ sortBy: option.id })}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                filters.sortBy === option.id
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <option.icon className="w-3 h-3" />
              <span className="hidden sm:inline">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pinned Section */}
      {pinnedMods.length > 0 && !filters.search && filters.category === 'all' && filters.project === 'all' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              Закрепленные
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pinnedMods.map((mod, i) => (
              <ModCard key={mod.id} mod={mod} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Regular Mods Grid */}
      <div>
          {pinnedMods.length > 0 && !filters.search && filters.category === 'all' && filters.project === 'all' && (
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Все моды</h3>
        )}

        {regularMods.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {regularMods.map((mod, i) => (
              <ModCard key={mod.id} mod={mod} index={i + pinnedMods.length} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-foreground/[0.03] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-400 mb-1">
              Моды не найдены
            </h3>
            <p className="text-sm text-zinc-600">
              Попробуйте изменить поиск или фильтры
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
