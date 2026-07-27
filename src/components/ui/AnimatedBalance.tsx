import { useState, useRef, useEffect } from 'react';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useAuthStore } from '@/store/authStore';
import { paymentsApi } from '@/api/payments';
import { Wallet, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  balance: number;
  className?: string;
  onClick?: () => void;
}

const quickAmounts = [100, 300, 500, 1000];

export default function AnimatedBalance({ balance, className = '', onClick }: Props) {
  const animated = useAnimatedNumber(balance);
  const { setBalance } = useAuthStore();

  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState<number | null>(null);
  const [custom, setCustom] = useState('');
  const [customLoading, setCustomLoading] = useState(false);

  const popupRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Delay showing popup so quick mouse movements don't trigger it
  const handleMouseEnter = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setShowPopup(true), 200);
  };
  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setShowPopup(false), 300);
  };

  // Close on click outside
  useEffect(() => {
    if (!showPopup) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPopup]);

  const handleDeposit = async (amount: number) => {
    setLoading(amount);
    try {
      const result = await paymentsApi.instantDeposit(amount);
      setBalance(result.balance);
      toast.success(`+${result.amount} ₡`);
    } catch (e: any) {
      toast.error(e?.message || 'Ошибка');
    } finally {
      setLoading(null);
    }
  };

  const handleCustom = () => {
    const value = parseInt(custom);
    if (!value || value < 10 || value > 50000) {
      toast.error('От 10 до 50 000 ₡');
      return;
    }
    setCustomLoading(true);
    paymentsApi.instantDeposit(value)
      .then((result) => {
        setBalance(result.balance);
        toast.success(`+${result.amount} ₡`);
        setCustom('');
      })
      .catch((e: any) => toast.error(e?.message || 'Ошибка'))
      .finally(() => setCustomLoading(false));
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={onClick}
        className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all
          hover:bg-foreground/10 active:scale-95 cursor-pointer
          ${showPopup ? 'bg-foreground/10' : ''}
          ${className}`}
      >
        <Wallet className="w-3 h-3 text-zinc-400" />
        <span className="text-[11px] font-semibold text-zinc-300 tabular-nums">
          {animated.toLocaleString()} <span className="text-[10px] text-zinc-500">₡</span>
        </span>
      </button>

      {showPopup && (
        <div
          ref={popupRef}
          onMouseEnter={() => { clearTimeout(hoverTimer.current); }}
          onMouseLeave={handleMouseLeave}
          className="absolute right-0 top-8 w-52 glass-card bg-card border border-foreground/[0.1] rounded-xl shadow-xl shadow-black/50 z-[100] overflow-hidden"
        >
          <div className="p-2.5 space-y-2">
            <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
              Быстрое пополнение
            </p>

            <div className="grid grid-cols-4 gap-1.5">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleDeposit(amt)}
                  disabled={loading === amt}
                  className="flex items-center justify-center h-8 rounded-lg text-xs font-medium bg-foreground/[0.05] hover:bg-zinc-500/20 border border-foreground/[0.08] hover:border-zinc-500/30 text-zinc-300 hover:text-zinc-200 transition-all disabled:opacity-50"
                >
                  {loading === amt ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>{amt}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5">
              <input
                type="number"
                placeholder="Своя"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                min={10}
                max={50000}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCustom(); }}
                className="flex-1 h-8 bg-foreground/[0.03] border border-foreground/[0.06] rounded-lg px-2.5 text-xs text-foreground placeholder:text-zinc-600 outline-none focus:border-zinc-500/50 transition-colors"
              />
              <button
                onClick={handleCustom}
                disabled={customLoading}
                className="flex items-center justify-center w-8 h-8 bg-zinc-500 hover:bg-zinc-500/80 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {customLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
