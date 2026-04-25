import api from './axios'
import type { ApiEnvelope } from '../types/auth'
import type {
  CreateMilestoneInput,
  Milestone,
  Project,
} from '../types/project'

function unwrapResponse<T>(payload: T | ApiEnvelope<T>): T {
  if (payload !== null && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export const projectsService = {
  async list(): Promise<Project[]> {
    const { data } = await api.get<ApiEnvelope<Project[]> | Project[]>('/projects')
    return unwrapResponse<Project[]>(data)
  },

  async getById(id: number): Promise<Project> {
    const { data } = await api.get<ApiEnvelope<Project> | Project>(`/projects/${id}`)
    return unwrapResponse<Project>(data)
  },

  async listMilestones(projectId: number): Promise<Milestone[]> {
    const { data } = await api.get<ApiEnvelope<Milestone[]> | Milestone[]>(
      `/projects/${projectId}/milestones`,
    )
    return unwrapResponse<Milestone[]>(data)
  },

  async createMilestone(
    projectId: number,
    input: CreateMilestoneInput,
    sequence: number,
  ): Promise<Milestone> {
    const payload = {
      title: input.title,
      description: input.description || undefined,
      amount: input.amount,
      sequence,
    }

    const { data } = await api.post<ApiEnvelope<Milestone> | Milestone>(
      `/projects/${projectId}/milestones`,
      payload,
    )

    return unwrapResponse<Milestone>(data)
  },

  async createFromAcceptedBid(bidId: number): Promise<Project> {
    const { data } = await api.post<ApiEnvelope<Project> | Project>(
      `/projects/from-bid/${bidId}`,
    )

    return unwrapResponse<Project>(data)
  },
}
