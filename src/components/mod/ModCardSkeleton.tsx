/**
 * Скелетон карточки мода — повторяет форму обычной ModCard.
 * Показывается во время загрузки данных с бэкенда.
 */
import { Skeleton } from "@/components/ui/skeleton";

export function ModCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <div
      className="overflow-hidden glass-card"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Image placeholder */}
      <div className="relative aspect-[16/9] bg-foreground/[0.03]">
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="w-8 h-8 rounded-md" />
        </div>
      </div>

      {/* Content */}
      <div className="relative p-2.5 space-y-2">
        {/* Title */}
        <Skeleton className="h-3.5 w-3/4 rounded" />

        {/* Author */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="w-3.5 h-3.5 rounded-full" />
          <Skeleton className="h-2.5 w-20 rounded" />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 pt-1.5 border-t border-foreground/[0.06]">
          <div className="flex items-center gap-1">
            <Skeleton className="w-3 h-3 rounded" />
            <Skeleton className="h-2.5 w-6 rounded" />
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="w-3 h-3 rounded" />
            <Skeleton className="h-2.5 w-4 rounded" />
          </div>
          <Skeleton className="h-4 w-12 rounded ml-auto" />
        </div>
      </div>
    </div>
  );
}

/** Сетка N скелетонов-карточек */
export function ModCardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ModCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
}
