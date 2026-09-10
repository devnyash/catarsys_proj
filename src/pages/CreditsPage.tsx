import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowDownLeft, ArrowUpRight, ShoppingCart, Coins, CreditCard, QrCode, Globe, CircleDollarSign, History } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { paymentsApi } from '@/api/payments';
import { mockTransactions } from '@/data/mock';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const quickAmounts = [100, 300, 500, 1000];

export default function CreditsPage() {
  const { user, setBalance } = useAuthStore();
  const [customAmount, setCustomAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  const handleQuickDeposit = async (value: number) => {
    setIsDepositing(true);
    try {
      const result = await paymentsApi.instantDeposit(value);
      setBalance(result.balance);
      toast.success(`+${result.amount} ₡ добавлено на баланс`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка при пополнении';
      toast.error(msg);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleCustomDeposit = () => {
    const value = parseInt(customAmount);
    if (!value || value < 10 || value > 50000) {
      toast.error('Сумма должна быть от 10 до 50 000 ₡');
      return;
    }
    handleQuickDeposit(value);
    setCustomAmount('');
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return ArrowDownLeft;
      case 'purchase':
        return ShoppingCart;
      case 'withdrawal':
        return ArrowUpRight;
      case 'earning':
        return Coins;
      default:
        return CircleDollarSign;
    }
  };

  const getTransactionColor = () => {
    return 'text-zinc-400 bg-zinc-500/10';
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full scrollbar-thin">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground mb-1">Баланс</h1>
        <p className="text-sm text-zinc-500">Управляйте своими средствами</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-zinc-500/10 to-transparent rounded-full -translate-y-10 translate-x-10" />
        <div className="relative">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Текущий баланс</p>
          <motion.p key={user?.balance} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="text-4xl font-bold text-foreground">
            {user?.balance.toLocaleString()} ₡
          </motion.p>
          <div className="mt-4">
            <p className="text-xs text-zinc-500 mb-2">Быстрое пополнение</p>
            <div className="flex gap-2">
              {quickAmounts.map((amt) => (
                <Button key={amt} variant="ghost" size="sm" onClick={() => handleQuickDeposit(amt)} disabled={isDepositing} className="px-4 py-2 text-xs text-zinc-300 hover:text-zinc-400">
                  {amt} ₡
                </Button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input type="number" placeholder="Своя сумма" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} min={10} max={50000} className="flex-1 h-9 text-xs" />
              <Button onClick={handleCustomDeposit} disabled={isDepositing} size="sm" className="px-4 h-9 bg-foreground hover:bg-foreground/90 text-background text-xs font-medium">
                Пополнить
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-zinc-500" />
          Способы оплаты
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: QrCode, label: 'QR-код', color: 'text-zinc-400' },
            { icon: CreditCard, label: 'Карта РФ', color: 'text-zinc-400' },
            { icon: Globe, label: 'Международная карта', color: 'text-zinc-400' },
            { icon: Wallet, label: 'Баланс', color: 'text-zinc-400' },
          ].map((method) => (
            <Button key={method.label} variant="ghost" className="flex flex-col items-center gap-2 p-3 h-auto bg-foreground/[0.03] hover:bg-foreground/[0.06] border border-foreground/[0.06]">
              <method.icon className={`w-5 h-5 ${method.color}`} />
              <span className="text-[10px] text-zinc-400">{method.label}</span>
            </Button>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-500" />
          История операций
        </h2>
        <div className="space-y-2">
          {mockTransactions.map((tx, i) => {
            const Icon = getTransactionIcon(tx.type);
            const colorClass = getTransactionColor();
            const isPositive = tx.amount > 0;
            return (
              <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center gap-3 p-3 bg-foreground/[0.02] rounded-lg">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{tx.description}</p>
                  <p className="text-[10px] text-zinc-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="text-xs font-semibold text-zinc-400">
                  {isPositive ? '+' : ''}{tx.amount.toLocaleString()} ₡
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
