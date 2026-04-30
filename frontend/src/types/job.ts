export interface Job {
  id: number
  title: string
  description: string
  budgetMin: number | null
  budgetMax: number | null
  currency: string | null
  customer?: {
    id: number
    fullName: string
  }
  createdAt?: string
  status?: string
}

export interface CreateJobInput {
  title: string
  description: string
  budget: number
}

export interface ListJobsFilters {
  status?: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'CANCELED'
  q?: string
  category?: string
  skill?: string
  budgetMin?: number
  budgetMax?: number
  deadlineDaysMax?: number
}
