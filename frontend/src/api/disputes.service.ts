import api from './axios'
import type { ApiEnvelope } from '../types/auth'
import type { Dispute, DisputeResolution, DisputeStatus } from '../types/dispute'

function unwrapResponse<T>(payload: T | ApiEnvelope<T>): T {
  if (payload !== null && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export const disputesService = {
  async list(status: DisputeStatus = 'OPEN'): Promise<Dispute[]> {
    const { data } = await api.get<ApiEnvelope<Dispute[]> | Dispute[]>('/disputes', {
      params: { status },
    })
    return unwrapResponse<Dispute[]>(data)
  },

  async assign(disputeId: number): Promise<Dispute> {
    const { data } = await api.patch<ApiEnvelope<Dispute> | Dispute>(
      `/disputes/${disputeId}/assign`,
      {},
    )
    return unwrapResponse<Dispute>(data)
  },

  async resolve(disputeId: number, resolution: DisputeResolution, decisionNote: string): Promise<Dispute> {
    const { data } = await api.patch<ApiEnvelope<Dispute> | Dispute>(
      `/disputes/${disputeId}/resolve`,
      { resolution, decisionNote },
    )
    return unwrapResponse<Dispute>(data)
  },
}
