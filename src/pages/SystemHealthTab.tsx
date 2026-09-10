import { useState } from "react";
import { motion } from "framer-motion";
import { Server, Database, Activity, Wifi, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ServiceStatus {
  name: string;
  icon: React.ElementType;
  status: 'online' | 'warning' | 'offline';
  latency?: number;
  details: string;
}

export default function SystemHealthTab() {
  const [services] = useState<ServiceStatus[]>([
    { name: 'API Server', icon: Server, status: 'online', latency: 45, details: 'Все эндпоинты отвечают' },
    { name: 'MySQL', icon: Database, status: 'online', latency: 12, details: 'Подключение активно' },
    { name: 'Redis', icon: Activity, status: 'online', latency: 3, details: 'Кеш работает' },
    { name: 'Telegram Bot', icon: Wifi, status: 'warning', details: 'Задержка ответа' },
  ]);

  const overallStatus = services.every(s => s.status === 'online') ? 'operational' :
                        services.some(s => s.status === 'offline') ? 'down' : 'degraded';

  const statusColors = {
    online: 'text-emerald-400',
    warning: 'text-amber-400',
    offline: 'text-red-400',
  };

  const statusBg = {
    online: 'bg-emerald-400/10',
    warning: 'bg-amber-400/10',
    offline: 'bg-red-400/10',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Системное здоровье</h2>
      </div>

      {/* Overall Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border p-4 ${
          overallStatus === 'operational' ? 'bg-emerald-500/10 border-emerald-500/20' :
          overallStatus === 'degraded' ? 'bg-amber-500/10 border-amber-500/20' :
          'bg-red-500/10 border-red-500/20'
        }`}
      >
        <div className="flex items-center gap-2">
          {overallStatus === 'operational' ? <CheckCircle className="w-5 h-5 text-emerald-400" /> :
           overallStatus === 'degraded' ? <AlertTriangle className="w-5 h-5 text-amber-400" /> :
           <AlertTriangle className="w-5 h-5 text-red-400" />}
          <span className="text-sm font-medium text-foreground">
            {overallStatus === 'operational' ? 'Все системы работают' :
             overallStatus === 'degraded' ? 'Есть проблемы' : 'Сервис недоступен'}
          </span>
        </div>
      </motion.div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {services.map((service, i) => (
          <motion.div
            key={service.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 hover:bg-foreground/[0.04] transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${statusBg[service.status]} flex items-center justify-center`}>
                  <service.icon className={`w-4 h-4 ${statusColors[service.status]}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{service.name}</p>
                  <p className="text-xs text-muted-foreground">{service.details}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <Badge className={`text-[10px] px-1.5 py-0.5 border ${statusBg[service.status]} ${statusColors[service.status]}`}>
                {service.status === 'online' ? 'Online' :
                 service.status === 'warning' ? 'Warning' : 'Offline'}
              </Badge>
              {service.latency && (
                <span className="text-xs text-muted-foreground">{service.latency}ms</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
