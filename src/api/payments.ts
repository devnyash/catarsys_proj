import { api } from './client';
import type { Transaction } from '@/types';

export interface WithdrawRequest {
  amount: number;
  method: string;
  details: string;
}

export interface DepositResponse {
  url: string;
  transactionId: number;
}

export interface CheckoutRequest {
  item_ids: number[];
  promo_code?: string;
}

export interface CheckoutResponse {
  purchases: number[];
  totalPaid: number;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  nextCursor?: string;
  total: number;
}

export const paymentsApi = {
  deposit: (amount: number) =>
    api.post<DepositResponse>('/payments/deposit', { amount }),

  getTransactions: (cursor?: string, limit?: number) => {
    const params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = String(limit);
    const query = new URLSearchParams(params).toString();
    return api.get<TransactionListResponse>(`/payments/transactions${query ? `?${query}` : ''}`);
  },

  withdraw: (data: WithdrawRequest) =>
    api.post<void>('/payments/withdraw', data),

  checkout: (data: CheckoutRequest) =>
    api.post<CheckoutResponse>('/payments/checkout', data),
};
