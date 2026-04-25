export type PaymentStatus = 'PENDING' | 'RELEASED' | 'REFUNDED'

export interface Payment {
  id: number
  milestoneId: number | null
  projectId: number | null
  amount: number | string
  currency: string
  status: PaymentStatus
  createdAt: string
  milestone?: {
    id: number
    title: string
    sequence: number
    project?: {
      id: number
      title: string
      customerId: number
      freelancerId: number
    }
  } | null
  project?: {
    id: number
    title: string
    customerId: number
    freelancerId: number
  } | null
}

export interface WalletSummary {
  pendingAmount: number
  releasedAmount: number
  refundedAmount: number
  pendingCount: number
  releasedCount: number
  refundedCount: number
  currency: string
  totalRecords: number
}
