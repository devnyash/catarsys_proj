import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  Clock,
  ArrowUpDown,
  Sparkles,
  RefreshCw,
  ChevronDown,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
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

type SortId = (typeof sortOptions)[number]['id'];

export default function HomePage() {
  const { filters, setFilters, getFilteredMods, fetchMods } = useModStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [refreshing, setRefreshing] = useState(false);

  // Load approved mods from the backend so newly approved mods appear here.
  useEffect(() => {
    fetchMods();
  }, [fetchMods]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMods();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredMods = getFilteredMods();
  const pinnedMods = filteredMods.filter((m) => m.isPinned);
  const regularMods = filteredMods.filter((m) => !m.isPinned);

  const handleSearch = (value: string) => {
    setLocalSearch(value);
    setFilters({ search: value });
  };

  const currentSort = sortOptions.find((o) => o.id === filters.sortBy) ?? sortOptions[0];
  const activeFilterCount =
    (filters.category !== 'all' ? 1 : 0) +
    (filters.project !== 'all' ? 1 : 0) +
    (filters.priceRange !== 'all' ? 1 : 0);

  const iconBtn =
    'w-9 h-9 rounded-lg flex items-center justify-center transition-colors outline-none';

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

      {/* Header: title + compact vertical icon toolbar */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground pt-1.5">
          {filters.category === 'all' ? 'Все моды' : categoryLabels[filters.category]}
        </h2>

        <div className="flex flex-col gap-1.5 p-1.5 rounded-xl bg-foreground/[0.03] border border-foreground/[0.08]">
          {/* Search */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="Поиск"
                className={`${iconBtn} ${
                  filters.search
                    ? 'text-foreground bg-foreground/10'
                    : 'text-zinc-500 hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                <Search className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Поиск</TooltipContent>
          </Tooltip>

          {/* Filters */}
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    aria-label="Фильтры"
                    className={`${iconBtn} relative ${
                      activeFilterCount > 0
                        ? 'text-foreground bg-foreground/10'
                        : 'text-zinc-500 hover:text-foreground hover:bg-foreground/5'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-0.5 rounded-full bg-indigo-500 text-[10px] font-semibold text-white flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="left">Фильтры</TooltipContent>
            </Tooltip>
            <PopoverContent align="end" className="w-64 p-3 space-y-3">
              {/* Categories */}
              <div>
                <span className="text-[11px] text-zinc-500 mb-1.5 block">Категория</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilters({ category: 'all' })}
                    className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
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
                      className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
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
                <span className="text-[11px] text-zinc-500 mb-1.5 block">Проект</span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFilters({ project: 'all' })}
                    className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
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
                      className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
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
                <span className="text-[11px] text-zinc-500 mb-1.5 block">Цена</span>
                <div className="flex gap-1.5">
                  {[
                    { id: 'all' as const, label: 'Все' },
                    { id: 'free' as const, label: 'Бесплатные' },
                    { id: 'paid' as const, label: 'Платные' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setFilters({ priceRange: option.id })}
                      className={`px-2.5 py-1 text-[11px] rounded-md transition-colors ${
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

              {activeFilterCount > 0 && (
                <button
                  onClick={() =>
                    setFilters({ category: 'all', project: 'all', priceRange: 'all' })
                  }
                  className="w-full py-1.5 text-[11px] rounded-md border border-foreground/[0.08] text-zinc-400 hover:text-foreground hover:bg-foreground/5 transition-colors"
                >
                  Сбросить фильтры
                </button>
              )}
            </PopoverContent>
          </Popover>

          {/* Sort */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Сортировка"
                    className={`${iconBtn} ${
                      filters.sortBy !== 'popular'
                        ? 'text-foreground bg-foreground/10'
                        : 'text-zinc-500 hover:text-foreground hover:bg-foreground/5'
                    }`}
                  >
                    <currentSort.icon className="w-4 h-4" />
                    <ChevronDown className="w-3 h-3 text-zinc-600" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="left">
                Сортировка: {currentSort.label}
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={filters.sortBy}
                onValueChange={(v) => setFilters({ sortBy: v as SortId })}
              >
                {sortOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.id} value={option.id}>
                    <option.icon className="w-4 h-4" />
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Обновить"
                className={`${iconBtn} text-zinc-500 hover:text-foreground hover:bg-foreground/5 disabled:opacity-50`}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Обновить</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[15vh]"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSearchOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-lg"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={localSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setSearchOpen(false);
                  }}
                  placeholder="Поиск модов, авторов, категорий..."
                  className="w-full h-14 bg-zinc-900/95 border border-foreground/[0.12] rounded-2xl pl-12 pr-12 text-base text-foreground placeholder:text-zinc-600 outline-none focus:border-zinc-500/50 shadow-2xl transition-colors"
                />
                {localSearch && (
                  <button
                    onClick={() => handleSearch('')}
                    aria-label="Очистить поиск"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-foreground hover:bg-foreground/5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Section */}
      {pinnedMods.length > 0 && !filters.search && filters.category === 'all' && filters.project === 'all' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              Закрепленные
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
