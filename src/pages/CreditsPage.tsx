import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingCart,
  Coins,
  CreditCard,
  QrCode,
  Globe,
  CircleDollarSign,
  History,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { mockTransactions } from '@/data/mock';
import toast from 'react-hot-toast';

const quickAmounts = [100, 300, 500, 1000];

export default function CreditsPage() {
  const { user, updateBalance } = useAuthStore();
    const [customAmount, setCustomAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  const handleQuickDeposit = (value: number) => {
    setIsDepositing(true);
    setTimeout(() => {
      updateBalance(value);
      setIsDepositing(false);
      toast.success(`+${value} ₽ добавлено на баланс`);
    }, 1000);
  };

  const handleCustomDeposit = () => {
    const value = parseInt(customAmount);
    if (!value || value < 10 || value > 50000) {
      toast.error('Сумма должна быть от 10 до 50 000 ₽');
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

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'text-emerald-400 bg-emerald-500/10';
      case 'purchase':
        return 'text-rose-400 bg-rose-500/10';
      case 'withdrawal':
        return 'text-amber-400 bg-amber-500/10';
      case 'earning':
        return 'text-sky-400 bg-sky-500/10';
      default:
        return 'text-zinc-400 bg-white/[0.03]';
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-white mb-1">Баланс</h1>
        <p className="text-sm text-zinc-500">Управляйте своими средствами</p>
      </motion.div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-rose-500/10 to-transparent rounded-full -translate-y-10 translate-x-10" />

        <div className="relative">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
            Текущий баланс
          </p>
          <motion.p
            key={user?.balance}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-4xl font-bold text-white"
          >
            {user?.balance.toLocaleString()} ₽
          </motion.p>

          {/* Quick Deposit */}
          <div className="mt-4">
            <p className="text-xs text-zinc-500 mb-2">Быстрое пополнение</p>
            <div className="flex gap-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleQuickDeposit(amt)}
                  disabled={isDepositing}
                  className="px-4 py-2 bg-white/[0.05] hover:bg-rose-500/20 border border-white/[0.08] hover:border-rose-500/30 rounded-lg text-xs text-zinc-300 hover:text-rose-400 transition-colors disabled:opacity-50"
                >
                  {amt} ₽
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-2">
              <input
                type="number"
                placeholder="Своя сумма"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min={10}
                max={50000}
                className="flex-1 h-9 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-rose-500/50 transition-colors"
              />
              <button
                onClick={handleCustomDeposit}
                disabled={isDepositing}
                className="px-4 h-9 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Пополнить
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Payment Methods */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-5"
      >
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-zinc-500" />
          Способы оплаты
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: QrCode, label: 'QR-код', color: 'text-emerald-400' },
            { icon: CreditCard, label: 'Карта РФ', color: 'text-sky-400' },
            { icon: Globe, label: 'Международная карта', color: 'text-violet-400' },
            { icon: Wallet, label: 'Баланс', color: 'text-amber-400' },
          ].map((method) => (
            <button
              key={method.label}
              className="flex flex-col items-center gap-2 p-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg transition-colors"
            >
              <method.icon className={`w-5 h-5 ${method.color}`} />
              <span className="text-[10px] text-zinc-400">{method.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card p-5"
      >
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-zinc-500" />
          История операций
        </h2>

        <div className="space-y-2">
          {mockTransactions.map((tx, i) => {
            const Icon = getTransactionIcon(tx.type);
            const colorClass = getTransactionColor(tx.type);
            const isPositive = tx.amount > 0;

            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {tx.description}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {tx.amount.toLocaleString()} ₽
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
