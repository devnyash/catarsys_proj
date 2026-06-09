import { create } from 'zustand';
import type { Mod } from '@/types';
import { paymentsApi } from '@/api/payments';

interface CartItem {
  mod: Mod;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  promoCode: string;
  promoDiscount: number;
  isCheckingOut: boolean;
  addItem: (mod: Mod) => void;
  removeItem: (modId: number) => void;
  clearCart: () => void;
  setPromoCode: (code: string) => void;
  applyPromo: (code: string) => boolean;
  getTotal: () => number;
  getDiscountedTotal: () => number;
  isInCart: (modId: number) => boolean;
  getItemCount: () => number;
  checkout: () => Promise<boolean>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  promoCode: '',
  promoDiscount: 0,
  isCheckingOut: false,

  addItem: (mod) =>
    set((state) => {
      const exists = state.items.find((i) => i.mod.id === mod.id);
      if (exists) return state;
      return { items: [...state.items, { mod, quantity: 1 }] };
    }),

  removeItem: (modId) =>
    set((state) => ({
      items: state.items.filter((i) => i.mod.id !== modId),
    })),

  clearCart: () => set({ items: [], promoCode: '', promoDiscount: 0 }),

  setPromoCode: (code) => set({ promoCode: code }),

  applyPromo: (code) => {
    const validCodes: Record<string, number> = {
      CATARSYS: 15,
      GTA5: 10,
      WELCOME: 20,
    };
    const discount = validCodes[code.toUpperCase()];
    if (discount) {
      set({ promoCode: code.toUpperCase(), promoDiscount: discount });
      return true;
    }
    return false;
  },

  getTotal: () =>
    get().items.reduce((sum, item) => sum + item.mod.price, 0),

  getDiscountedTotal: () => {
    const total = get().getTotal();
    const discount = get().promoDiscount;
    return Math.round(total * (1 - discount / 100));
  },

  isInCart: (modId) => get().items.some((i) => i.mod.id === modId),

  getItemCount: () => get().items.length,

  checkout: async () => {
    const state = get();
    if (state.items.length === 0) return false;
    set({ isCheckingOut: true });
    try {
      await paymentsApi.checkout({
        item_ids: state.items.map((i) => i.mod.id),
        promo_code: state.promoDiscount > 0 ? state.promoCode : undefined,
      });
      set({ items: [], promoCode: '', promoDiscount: 0, isCheckingOut: false });
      return true;
    } catch {
      set({ isCheckingOut: false });
      throw new Error('Checkout failed');
    }
  },
}));
