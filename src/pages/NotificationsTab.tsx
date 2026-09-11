import { motion } from "framer-motion";
import { Bell, AlertTriangle, Users, Package, Home } from "lucide-react";
import type { AdminTab } from "@/pages/AdminPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NotificationsTabProps {
  pendingMods: number;
  newUsers: number;
  openTickets: number;
  onNavigate: (tab: AdminTab) => void;
}

export default function NotificationsTab({ pendingMods, newUsers, openTickets, onNavigate }: NotificationsTabProps) {
  const urgent = pendingMods > 0;
  const items = [
    {
      icon: Package,
      iconColor: "text-amber-400",
      bgColor: "bg-amber-400/10",
      title: "Моды на модерации",
      description: `${pendingMods} модов ожидают проверки`,
      action: "moderation" as AdminTab,
      badge: pendingMods > 0 ? `${pendingMods}` : null,
      priority: pendingMods > 10 ? "high" : pendingMods > 0 ? "medium" : "low",
    },
    {
      icon: Users,
      iconColor: "text-blue-400",
      bgColor: "bg-blue-400/10",
      title: "Новые пользователи",
      description: `${newUsers} новых регистраций сегодня`,
      action: "users" as AdminTab,
      badge: null,
      priority: "low",
    },
    {
      icon: AlertTriangle,
      iconColor: "text-red-400",
      bgColor: "bg-red-400/10",
      title: "Открытые тикеты",
      description: `${openTickets} нерешённых обращений`,
      action: "users" as AdminTab,
      badge: openTickets > 0 ? `${openTickets}` : null,
      priority: openTickets > 0 ? "high" : "low",
    },
  ];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => onNavigate("home")} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
        <Home className="w-3.5 h-3.5" />
        <span className="text-xs">Главная</span>
      </Button>

      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Центр уведомлений</h2>
      </div>

      {urgent && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Требует внимания</p>
            <p className="text-xs text-muted-foreground">Есть моды, ожидающие модерации</p>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.button
            key={item.title}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onNavigate(item.action)}
            className="w-full flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3 hover:bg-foreground/[0.04] transition-colors text-left"
          >
            <div className={`w-8 h-8 rounded-lg ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
              <item.icon className={`w-4 h-4 ${item.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            {item.badge && (
              <Badge className="bg-foreground text-background text-[10px] px-1.5 py-0.5">
                {item.badge}
              </Badge>
            )}
            {item.priority === "high" && (
              <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
