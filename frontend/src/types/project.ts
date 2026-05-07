export interface Project {
  id: number
  title: string
  summary: string | null
  status: string
  totalAmount: number | string
  currency: string | null
  customerId: number
  freelancerId: number
  freelancer?: {
    id: number
    fullName: string
    email?: string
  }
  customer?: {
    id: number
    fullName: string
    email?: string
  }
  jobListing?: {
    id: number
    title: string
    status?: string
  }
  createdAt?: string
}

export interface Milestone {
  id: number
  projectId: number
  title: string
  description: string | null
  sequence: number
  amount: number | string
  status: string
  dueDate: string | null
  payment?: {
    id: number
    amount: number | string
    currency: string
    status: string
  } | null
  createdAt?: string
}

export interface CreateMilestoneInput {
  title: string
  description: string
  amount: number
  dueDate?: string
}
