import api from './axios'
import type { ApiEnvelope } from '../types/auth'
import type {
  BudgetAnalysis,
  DashboardSummary,
  FreelancerPerformance,
} from '../types/report'

function unwrapResponse<T>(payload: T | ApiEnvelope<T>): T {
  if (payload !== null && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export const reportsService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const { data } = await api.get<ApiEnvelope<DashboardSummary> | DashboardSummary>(
      '/reports/dashboard-summary',
    )
    return unwrapResponse<DashboardSummary>(data)
  },

  async getFreelancerPerformance(
    freelancerId?: number,
  ): Promise<FreelancerPerformance> {
    const { data } = await api.get<
      ApiEnvelope<FreelancerPerformance> | FreelancerPerformance
    >('/reports/freelancer-performance', {
      params: freelancerId ? { freelancerId } : undefined,
    })

    return unwrapResponse<FreelancerPerformance>(data)
  },

  async getBudgetAnalysis(projectId?: number): Promise<BudgetAnalysis> {
    const { data } = await api.get<ApiEnvelope<BudgetAnalysis> | BudgetAnalysis>(
      '/reports/budget-analysis',
      {
        params: projectId ? { projectId } : undefined,
      },
    )

    return unwrapResponse<BudgetAnalysis>(data)
  },
}
