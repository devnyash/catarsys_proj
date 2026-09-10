/**
 * Глобальный скелетон приложения — показывается при первом запуске,
 * пока грузятся данные профиля и уведомления с бэкенда.
 */
import { Skeleton } from "@/components/ui/skeleton";

export function AppSkeleton() {
  return (
    <div className="h-screen w-screen bg-background overflow-hidden text-foreground">
      {/* Sidebar skeleton */}
      <div className="absolute top-0 left-0 bottom-0 w-[80px] bg-background/50 border-r border-foreground/[0.06] p-3 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="w-full h-10 rounded-xl" />
        ))}
      </div>

      {/* Titlebar skeleton */}
      <div className="absolute top-0 left-[80px] right-0 h-[42px] bg-background/50 border-b border-foreground/[0.06] flex items-center px-4">
        <Skeleton className="h-6 w-32 rounded-lg" />
      </div>

      {/* Main content skeleton */}
      <main className="absolute top-[42px] left-[80px] right-2 bottom-2 rounded-2xl bg-background/90 backdrop-blur-xl border border-foreground/[0.06] overflow-hidden p-4 space-y-4">
        {/* Hero skeleton */}
        <Skeleton className="w-full h-40 rounded-2xl" />

        {/* Toolbar skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32 rounded-lg" />
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-9 h-9 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[16/9] rounded-xl" />
          ))}
        </div>
      </main>
    </div>
  );
}
