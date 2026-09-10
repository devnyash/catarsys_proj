import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  X,
  Tag,
  ArrowRight,
  Wallet,
  CreditCard,
  QrCode,
  Globe,
  CheckCircle,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useDownloadStore } from '@/store/downloadStore';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CartPage() {
  const {
    items,
    removeItem,
    clearCart,
    promoCode,
    applyPromo,
    promoDiscount,
    getTotal,
    getDiscountedTotal,
  } = useCartStore();
  const { user, updateBalance } = useAuthStore();
  const { setCurrentPage } = useUIStore();
  const { addTask } = useDownloadStore();

  const [promoInput, setPromoInput] = useState(promoCode);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const total = getTotal();
  const discountedTotal = getDiscountedTotal();
  const canAfford = user ? user.balance >= discountedTotal : false;

  const handleApplyPromo = () => {
    if (!promoInput.trim()) return;
    const success = applyPromo(promoInput);
    if (success) {
      toast.success(`Промокод применен! Скидка ${promoDiscount}%`);
    } else {
      toast.error('Неверный промокод');
    }
  };

  const handleCheckout = () => {
    if (!canAfford) {
      toast.error('Недостаточно средств');
      return;
    }
    setIsCheckingOut(true);
    setTimeout(() => {
      updateBalance(-discountedTotal);
      items.forEach((item) => {
        addTask({
          modId: item.mod.id,
          modTitle: item.mod.title,
          progress: 0,
          status: 'downloading',
          speed: '15.2 MB/s',
          totalSize: item.mod.fileSize,
          downloadedSize: '0 MB',
        });
      });
      clearCart();
      setIsCheckingOut(false);
      toast.success('Покупка успешна! Загрузки начаты.');
    }, 1500);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full scrollbar-thin">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-xl font-bold text-foreground mb-1">Корзина</h1>
        <p className="text-sm text-zinc-500">
          {items.length} {items.length === 1 ? 'товар' : items.length < 5 ? 'товара' : 'товаров'}
        </p>
      </motion.div>

      {items.length > 0 ? (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Items List */}
          <div className="flex-1 space-y-2">
            {items.map((item, i) => (
              <motion.div
                key={item.mod.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-3 flex items-center gap-3"
              >
                <img
                  src={item.mod.coverImage}
                  alt={item.mod.title}
                  className="w-16 h-10 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {item.mod.title}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    от {item.mod.author.displayName}
                  </p>
                </div>
                <span className="text-sm font-semibold text-zinc-400 flex-shrink-0">
                  {item.mod.price} ₡
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.mod.id)}
                  className="text-zinc-500 hover:text-zinc-400 hover:bg-zinc-500/10 flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              onClick={clearCart}
              className="text-xs text-zinc-500 hover:text-zinc-400"
            >
              Очистить корзину
            </Button>
          </div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-80 space-y-3"
          >
            <div className="glass-card p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Сводка заказа
              </h3>

              {/* Promo Code */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <Input
                    type="text"
                    placeholder="Промокод"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleApplyPromo}
                  className="px-3 text-xs text-zinc-300"
                >
                  Применить
                </Button>
              </div>

              {promoDiscount > 0 && (
                <div className="flex items-center gap-1 text-xs text-zinc-400">
                  <CheckCircle className="w-3 h-3" />
                  Скидка {promoDiscount}% применена
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-2 pt-2 border-t border-foreground/[0.06]">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-500">Подытог</span>
                  <span className="text-zinc-300">{total} ₡</span>
                </div>
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Скидка</span>
                    <span className="text-zinc-400">
                      -{total - discountedTotal} ₡
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold pt-2 border-t border-foreground/[0.06]">
                  <span className="text-foreground">Итого</span>
                  <span className="text-foreground">{discountedTotal} ₡</span>
                </div>
              </div>

              {/* Balance Info */}
              <div className="flex items-center gap-2 p-2 bg-foreground/[0.03] rounded-lg">
                <Wallet className="w-4 h-4 text-zinc-500" />
                <span className="text-xs text-zinc-400">
                  Баланс:{' '}
                  <span className={canAfford ? 'text-zinc-400' : 'text-zinc-400'}>
                    {user?.balance.toLocaleString() || 0} ₡
                  </span>
                </span>
              </div>

              {/* Checkout Button */}
              <Button
                onClick={handleCheckout}
                disabled={!canAfford || isCheckingOut}
                className="w-full h-10 bg-foreground hover:bg-foreground/90 disabled:bg-foreground/20 disabled:text-muted-foreground text-background text-sm font-medium"
              >
                {isCheckingOut ? (
                  <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Оплатить {discountedTotal} ₡
                  </>
                )}
              </Button>

              {!canAfford && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentPage('credits')}
                  className="w-full text-xs text-zinc-400 hover:text-zinc-300"
                >
                  Пополнить баланс
                </Button>
              )}
            </div>

            {/* Payment Methods */}
            <div className="glass-card p-4">
              <h3 className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                Способы оплаты
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: QrCode, label: 'QR-код' },
                  { icon: CreditCard, label: 'Карта РФ' },
                  { icon: Globe, label: 'Международная карта' },
                  { icon: Wallet, label: 'Баланс' },
                ].map((method) => (
                  <div
                    key={method.label}
                    className="flex items-center gap-2 p-2 bg-foreground/[0.03] rounded-lg"
                  >
                    <method.icon className="w-4 h-4 text-zinc-500" />
                    <span className="text-[10px] text-zinc-400">
                      {method.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-12 text-center"
        >
          <ShoppingCart className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-400 mb-1">
            Корзина пуста
          </h3>
          <p className="text-sm text-zinc-600 mb-4">
            Добавьте моды в корзину для покупки
          </p>
          <Button
            onClick={() => setCurrentPage('home')}
            className="inline-flex items-center gap-2 bg-foreground hover:bg-foreground/90 text-background text-sm font-medium"
          >
            <ArrowRight className="w-4 h-4" />
            Просмотреть моды
          </Button>
        </motion.div>
      )}
    </div>
  );
}
