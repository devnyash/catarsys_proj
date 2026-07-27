import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { Wallet } from 'lucide-react';

interface Props {
  balance: number;
  className?: string;
  onClick?: () => void;
}

export default function AnimatedBalance({ balance, className = '', onClick }: Props) {
  const animated = useAnimatedNumber(balance);

  return (
    <button
      onClick={onClick}
      title={`Баланс: ${balance.toLocaleString()} ₡`}
      className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all
        hover:bg-foreground/10 active:scale-95 cursor-pointer
        ${className}`}
    >
      <Wallet className="w-3 h-3 text-zinc-400" />
      <span className="text-[11px] font-semibold text-zinc-300 tabular-nums">
        {animated.toLocaleString()} <span className="text-[10px] text-zinc-500">₡</span>
      </span>
    </button>
  );
}
