export type DashboardSummary = {
  roles: string[]
  projectsByStatus: Record<string, number>
  openDisputes: number
  assignedOpenDisputes?: number
  paymentSummary: {
    totalRecords: number
    totalAmount: number
  }
  freelancerRating: {
    average: number
    reviewCount: number
  }
}

export type FreelancerPerformance = {
  freelancerId: number
  completedProjects: number
  deliveries: {
    approved: number
    revisionRequested: number
    submitted: number
  }
  onTimeDeliveryCount: number
  onTimeDeliveryRatio: number
  ratings: {
    average: number
    count: number
  }
  activityScore: number
}

export type BudgetProjectMilestone = {
  id: number
  title: string
  sequence: number
  amount: number
  status: string
  paymentStatus: string | null
}

export type BudgetProjectPayment = {
  id: number
  amount: number
  status: string
}

export type BudgetProjectAnalysis = {
  projectId: number
  title: string
  totalBudget: number
  milestonePlanned: number
  released: number
  refunded: number
  remainingBudget: number
  milestones: BudgetProjectMilestone[]
  projectLevelPayments: BudgetProjectPayment[]
}

export type BudgetPortfolioAnalysis = {
  projectCount: number
  totalBudget: number
  milestonePlanned: number
  released: number
  refunded: number
  remainingBudget: number
}

export type BudgetAnalysis = BudgetProjectAnalysis | BudgetPortfolioAnalysis
