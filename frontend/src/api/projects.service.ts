import api from './axios'
import type { ApiEnvelope } from '../types/auth'
import type {
  CreateMilestoneInput,
  Milestone,
  Project,
} from '../types/project'

type ProjectReview = {
  id: number
  projectId: number
  reviewerId: number
  revieweeId: number
  rating: number
  comment: string | null
  createdAt: string
  reviewer?: {
    id: number
    fullName: string
    email: string
  }
  reviewee?: {
    id: number
    fullName: string
    email: string
  }
}

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
      dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`).toISOString() : undefined,
    }

    const { data } = await api.post<ApiEnvelope<Milestone> | Milestone>(
      `/projects/${projectId}/milestones`,
      payload,
    )

    return unwrapResponse<Milestone>(data)
  },

  async updateStatus(
    projectId: number,
    payload: { status: 'ACTIVE' | 'COMPLETED' | 'CANCELED'; endDate?: string },
  ): Promise<Project> {
    const { data } = await api.patch<ApiEnvelope<Project> | Project>(
      `/projects/${projectId}/status`,
      payload,
    )
    return unwrapResponse<Project>(data)
  },

  async createFromAcceptedBid(bidId: number): Promise<Project> {
    const { data } = await api.post<ApiEnvelope<Project> | Project>(
      `/projects/from-bid/${bidId}`,
    )

    return unwrapResponse<Project>(data)
  },

  async createReview(
    projectId: number,
    payload: { rating: number; comment?: string; revieweeId?: number },
  ): Promise<ProjectReview> {
    const { data } = await api.post<ApiEnvelope<ProjectReview> | ProjectReview>(
      `/projects/${projectId}/reviews`,
      payload,
    )

    return unwrapResponse<ProjectReview>(data)
  },

  async listReviews(projectId: number): Promise<ProjectReview[]> {
    const { data } = await api.get<ApiEnvelope<ProjectReview[]> | ProjectReview[]>(
      `/projects/${projectId}/reviews`,
    )

    return unwrapResponse<ProjectReview[]>(data)
  },
}
