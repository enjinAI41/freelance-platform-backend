export type DisputeStatus = 'OPEN' | 'CANCELED' | 'RESOLVED'

export type DisputeResolution =
  | 'RELEASE_PAYMENT'
  | 'REFUND_PAYMENT'
  | 'PARTIAL_REFUND'
  | 'NO_ACTION'

export interface Dispute {
  id: number
  projectId: number
  milestoneId: number | null
  status: DisputeStatus
  resolution: DisputeResolution | null
  reason: string
  evidenceUrls?: string[] | null
  resolutionNote?: string | null
  createdAt: string
  project?: {
    id: number
    title: string
    status: string
  }
  milestone?: {
    id: number
    title: string
    sequence: number
  } | null
  openedBy?: {
    id: number
    fullName: string
  }
  assignedArbiter?: {
    id: number
    fullName: string
  } | null
}
