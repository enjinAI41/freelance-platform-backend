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
