import api from './axios'
import type { ApiEnvelope } from '../types/auth'
import type { Payment, WalletSummary } from '../types/payment'

function unwrapResponse<T>(payload: T | ApiEnvelope<T>): T {
  if (payload !== null && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export const paymentsService = {
  async getWalletSummary(): Promise<WalletSummary> {
    const { data } = await api.get<ApiEnvelope<WalletSummary> | WalletSummary>('/payments/wallet-summary')
    return unwrapResponse<WalletSummary>(data)
  },

  async getMyHistory(): Promise<Payment[]> {
    const { data } = await api.get<ApiEnvelope<Payment[]> | Payment[]>('/payments/my-history')
    return unwrapResponse<Payment[]>(data)
  },
}
