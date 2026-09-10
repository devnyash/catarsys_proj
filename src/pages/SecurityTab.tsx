import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Globe, Plus, X } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const suspiciousActivity = [
  { id: 1, type: 'multiple_accounts', user: 'user123', details: '3 аккаунта с одного IP', severity: 'high' },
  { id: 2, type: 'chargeback', user: 'buyer456', details: 'Возврат средств после покупки', severity: 'medium' },
  { id: 3, type: 'spam', user: 'spammer', details: 'Спам в отзывах', severity: 'low' },
];

const bannedIPs = [
  { id: 1, ip: '192.168.1.100', reason: 'Мультиаккаунты', date: '10.12.2024' },
  { id: 2, ip: '10.0.0.50', reason: 'DDoS атака', date: '09.12.2024' },
];

export default function SecurityTab() {
  const [newIP, setNewIP] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">Безопасность</h2>
      </div>

      {/* Add IP Ban */}
      <div className="flex items-center gap-2">
        <Input placeholder="IP адрес..." value={newIP} onChange={e => setNewIP(e.target.value)} className="h-8" />
        <Button size="sm" variant="outline"><Plus className="w-3.5 h-3.5 mr-1" /> Забанить</Button>
      </div>

      {/* Suspicious Activity */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Подозрительная активность</h3>
        <div className="space-y-2">
          {suspiciousActivity.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3">
              <AlertTriangle className={`w-4 h-4 ${item.severity === 'high' ? 'text-red-400' : item.severity === 'medium' ? 'text-amber-400' : 'text-blue-400'}`} />
              <div className="flex-1">
                <p className="text-sm text-foreground">{item.user}</p>
                <p className="text-xs text-muted-foreground">{item.details}</p>
              </div>
              <Badge className={`text-[10px] ${item.severity === 'high' ? 'bg-red-500/10 text-red-400' : item.severity === 'medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {item.severity}
              </Badge>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Banned IPs */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-2">Заблокированные IP</h3>
        <div className="space-y-2">
          {bannedIPs.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-mono text-foreground">{item.ip}</p>
                <p className="text-xs text-muted-foreground">{item.reason} · {item.date}</p>
              </div>
              <Button size="icon" variant="ghost" className="w-7 h-7 text-red-400 hover:bg-red-400/10"><X className="w-3.5 h-3.5" /></Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
