import api from './axios'
import type { CreateJobInput, Job, ListJobsFilters } from '../types/job'

type ApiEnvelope<T> = {
  success: boolean
  timestamp?: string
  path?: string
  data: T
}

type JobsListPayload = Job[] | { items?: Job[] }

function unwrapResponse<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'data' in payload
  ) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export const jobsService = {
  async list(filters?: ListJobsFilters): Promise<Job[]> {
    const { data } = await api.get<ApiEnvelope<JobsListPayload>>('/jobs', {
      params: filters,
    })
    const payload = unwrapResponse<JobsListPayload>(data)

    if (Array.isArray(payload)) {
      return payload
    }

    return payload.items ?? []
  },

  async getById(id: number): Promise<Job> {
    const { data } = await api.get<ApiEnvelope<Job>>(`/jobs/${id}`)
    return unwrapResponse(data)
  },

  async create(input: CreateJobInput): Promise<Job> {
    const payload = {
      title: input.title,
      description: input.description,
      budgetMin: input.budget,
      budgetMax: input.budget,
      currency: 'TRY',
    }

    const { data } = await api.post<ApiEnvelope<Job>>('/jobs', payload)
    return unwrapResponse(data)
  },
}
