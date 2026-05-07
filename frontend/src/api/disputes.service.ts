import api from './axios'
import type { ApiEnvelope } from '../types/auth'
import type { Dispute, DisputeResolution, DisputeStatus } from '../types/dispute'

type CreateDisputeInput = {
  reason: string
  milestoneId?: number
  evidenceUrls?: string[]
}

function unwrapResponse<T>(payload: T | ApiEnvelope<T>): T {
  if (payload !== null && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export const disputesService = {
  async create(projectId: number, payload: CreateDisputeInput): Promise<Dispute> {
    const { data } = await api.post<ApiEnvelope<Dispute> | Dispute>(
      `/projects/${projectId}/disputes`,
      payload,
    )
    return unwrapResponse<Dispute>(data)
  },

  async list(status?: DisputeStatus, projectId?: number): Promise<Dispute[]> {
    const { data } = await api.get<ApiEnvelope<Dispute[]> | Dispute[]>('/disputes', {
      params: {
        status,
        projectId,
      },
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

  async cancel(disputeId: number): Promise<Dispute> {
    const { data } = await api.patch<ApiEnvelope<Dispute> | Dispute>(
      `/disputes/${disputeId}/cancel`,
      {},
    )
    return unwrapResponse<Dispute>(data)
  },
}
