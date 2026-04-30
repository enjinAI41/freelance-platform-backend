import { useCallback, useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { PageTitle } from '../components/PageTitle'
import { reportsService } from '../api/reports.service'
import { useAuth } from '../context/AuthContext'
import type {
  BudgetAnalysis,
  BudgetProjectAnalysis,
  DashboardSummary,
  FreelancerPerformance,
} from '../types/report'

function getApiMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) {
    return fallback
  }

  return (
    (error.response?.data as { error?: { message?: string } } | undefined)?.error
      ?.message ??
    (error.response?.data as { message?: string } | undefined)?.message ??
    fallback
  )
}

function formatCurrency(amount: number): string {
  return `TRY ${amount.toLocaleString('tr-TR')}`
}

function isProjectBudgetAnalysis(
  data: BudgetAnalysis | null,
): data is BudgetProjectAnalysis {
  return Boolean(data && 'projectId' in data)
}

export function ReportsPage() {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const isFreelancer = roles.includes('FREELANCER')

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [performance, setPerformance] = useState<FreelancerPerformance | null>(null)
  const [budget, setBudget] = useState<BudgetAnalysis | null>(null)

  const [freelancerIdInput, setFreelancerIdInput] = useState('')
  const [projectIdInput, setProjectIdInput] = useState('')

  const [isSummaryLoading, setIsSummaryLoading] = useState(true)
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false)
  const [isBudgetLoading, setIsBudgetLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSummary = useCallback(async () => {
    setIsSummaryLoading(true)
    setError(null)

    try {
      const data = await reportsService.getDashboardSummary()
      setSummary(data)
    } catch (err) {
      setError(getApiMessage(err, 'Rapor özeti alınamadı.'))
    } finally {
      setIsSummaryLoading(false)
    }
  }, [])

  const loadPerformance = useCallback(async (freelancerId?: number) => {
    setIsPerformanceLoading(true)
    setError(null)

    try {
      if (!isFreelancer && !freelancerId) {
        setError('Bu rol için Freelancer Kimliği zorunlu.')
        return
      }

      const data = await reportsService.getFreelancerPerformance(freelancerId)
      setPerformance(data)
    } catch (err) {
      setError(getApiMessage(err, 'Freelancer performansı alınamadı.'))
    } finally {
      setIsPerformanceLoading(false)
    }
  }, [isFreelancer])

  const loadBudget = useCallback(async (projectId?: number) => {
    setIsBudgetLoading(true)
    setError(null)

    try {
      const data = await reportsService.getBudgetAnalysis(projectId)
      setBudget(data)
    } catch (err) {
      setError(getApiMessage(err, 'Bütçe analizi alınamadı.'))
    } finally {
      setIsBudgetLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadSummary()
      if (isFreelancer) {
        void loadPerformance()
      }
      void loadBudget()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [isFreelancer, loadBudget, loadPerformance, loadSummary])

  return (
    <section className="page-card">
      <div className="jobs-header">
        <PageTitle
          title="Raporlama ve Dashboard"
          description="Performans, bütçe ve durum özetlerini tek panelden incele."
        />
        <button
          className="button button-subtle"
          type="button"
          onClick={() => {
            void loadSummary()
            if (isFreelancer) {
              void loadPerformance()
            }
            void loadBudget()
          }}
        >
          Yenile
        </button>
      </div>

      {error ? <p className="page-note">{error}</p> : null}

      <div className="panel-metric-grid">
        <article className="metric-tile">
          <span>Açık Uyuşmazlık</span>
          <strong>{isSummaryLoading || !summary ? '...' : summary.openDisputes}</strong>
        </article>
        <article className="metric-tile">
          <span>Toplam Ödeme Hacmi</span>
          <strong>
            {isSummaryLoading || !summary
              ? '...'
              : formatCurrency(summary.paymentSummary.totalAmount)}
          </strong>
        </article>
        <article className="metric-tile">
          <span>Ortalama Puan</span>
          <strong>
            {isSummaryLoading || !summary
              ? '...'
              : `${summary.freelancerRating.average.toFixed(2)} / 5`}
          </strong>
        </article>
      </div>

      <div className="quick-grid">
        <article className="quick-card">
          <h3>Freelancer Performans Raporu</h3>
          <div className="form-group">
            <label htmlFor="freelancerIdInput">Freelancer Kimliği</label>
            <input
              id="freelancerIdInput"
              type="number"
              min={1}
              value={freelancerIdInput}
              onChange={(event) => setFreelancerIdInput(event.target.value)}
              placeholder={isFreelancer ? 'Boş bırakırsan kendi hesabın' : 'Zorunlu'}
            />
          </div>
          <button
            className="button button-subtle"
            type="button"
            onClick={() => {
              let parsedFreelancerId: number | undefined
              if (freelancerIdInput.trim()) {
                const value = Number(freelancerIdInput)
                if (!Number.isInteger(value)) {
                  setError('Freelancer Kimliği sayı olmalıdır.')
                  return
                }
                parsedFreelancerId = value
              }
              void loadPerformance(parsedFreelancerId)
            }}
          >
            {isPerformanceLoading ? 'Yükleniyor...' : 'Performansı Getir'}
          </button>

          {performance ? (
            <div className="timeline-list" style={{ marginTop: '10px' }}>
              <div className="timeline-row">
                <strong>Tamamlanan Proje: {performance.completedProjects}</strong>
                <span>Aktivite Skoru: {performance.activityScore}</span>
                <span>
                  Zamanında Teslim Oranı: %{(performance.onTimeDeliveryRatio * 100).toFixed(0)}
                </span>
              </div>
              <div className="timeline-row">
                <strong>Teslim Durumları</strong>
                <span>Onaylanan: {performance.deliveries.approved}</span>
                <span>Revizyon: {performance.deliveries.revisionRequested}</span>
                <span>Bekleyen: {performance.deliveries.submitted}</span>
              </div>
            </div>
          ) : null}
        </article>

        <article className="quick-card">
          <h3>Bütçe Analizi</h3>
          <div className="form-group">
            <label htmlFor="projectIdInput">Proje Kimliği</label>
            <input
              id="projectIdInput"
              type="number"
              min={1}
              value={projectIdInput}
              onChange={(event) => setProjectIdInput(event.target.value)}
              placeholder="Boş bırakırsan genel portföy analizi"
            />
          </div>
          <button
            className="button button-subtle"
            type="button"
            onClick={() => {
              let parsedProjectId: number | undefined
              if (projectIdInput.trim()) {
                const value = Number(projectIdInput)
                if (!Number.isInteger(value)) {
                  setError('Proje Kimliği sayı olmalıdır.')
                  return
                }
                parsedProjectId = value
              }
              void loadBudget(parsedProjectId)
            }}
          >
            {isBudgetLoading ? 'Yükleniyor...' : 'Bütçe Raporu Getir'}
          </button>

          {budget ? (
            <div className="timeline-list" style={{ marginTop: '10px' }}>
              <div className="timeline-row">
                <strong>Toplam Bütçe</strong>
                <span>{formatCurrency(budget.totalBudget)}</span>
              </div>
              <div className="timeline-row">
                <strong>Planlanan Milestone</strong>
                <span>{formatCurrency(budget.milestonePlanned)}</span>
                <span>Serbest Bırakılan: {formatCurrency(budget.released)}</span>
                <span>İade: {formatCurrency(budget.refunded)}</span>
              </div>
              {isProjectBudgetAnalysis(budget) ? (
                <div className="timeline-row">
                  <strong>Proje #{budget.projectId} - {budget.title}</strong>
                  <span>Kalan Bütçe: {formatCurrency(budget.remainingBudget)}</span>
                  <span>Milestone Sayısı: {budget.milestones.length}</span>
                </div>
              ) : (
                <div className="timeline-row">
                  <strong>Genel Portföy</strong>
                  <span>Proje Sayısı: {budget.projectCount}</span>
                  <span>Kalan Bütçe: {formatCurrency(budget.remainingBudget)}</span>
                </div>
              )}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  )
}
