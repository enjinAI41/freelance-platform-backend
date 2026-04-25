import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { PageTitle } from '../components/PageTitle'
import { paymentsService } from '../api/payments.service'
import type { Payment, WalletSummary } from '../types/payment'

function getApiMessage(error: unknown, fallback: string): string {
  if (!isAxiosError(error)) {
    return fallback
  }

  return (
    (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
    (error.response?.data as { message?: string } | undefined)?.message ??
    fallback
  )
}

function formatAmount(amount: number | string, currency?: string): string {
  return `${currency ?? 'TRY'} ${amount}`
}

export function WalletPage() {
  const [summary, setSummary] = useState<WalletSummary | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        setError(null)
        const [summaryData, historyData] = await Promise.all([
          paymentsService.getWalletSummary(),
          paymentsService.getMyHistory(),
        ])
        setSummary(summaryData)
        setPayments(historyData)
      } catch (err) {
        setError(getApiMessage(err, 'Odeme bilgileri alinamadi.'))
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <section className="page-card">
      <PageTitle title="Wallet & Payments" description="Cuzdan ozeti ve odeme gecmisi" />

      {isLoading ? <p>Loading...</p> : null}
      {error ? <p className="page-note">{error}</p> : null}

      {!isLoading && !error && summary ? (
        <>
          <div className="stats-grid">
            <article className="stat-card">
              <span>Pending</span>
              <strong>{formatAmount(summary.pendingAmount, summary.currency)}</strong>
            </article>
            <article className="stat-card">
              <span>Released</span>
              <strong>{formatAmount(summary.releasedAmount, summary.currency)}</strong>
            </article>
            <article className="stat-card">
              <span>Refunded</span>
              <strong>{formatAmount(summary.refundedAmount, summary.currency)}</strong>
            </article>
            <article className="stat-card">
              <span>Total Records</span>
              <strong>{summary.totalRecords}</strong>
            </article>
          </div>

          <div className="jobs-header" style={{ marginTop: '18px' }}>
            <PageTitle title="Payment History" description="Tum odeme hareketleri" />
          </div>

          <div className="milestone-list">
            {payments.map((payment) => (
              <article className="milestone-card" key={payment.id}>
                <div className="project-row">
                  <h3>Payment #{payment.id}</h3>
                  <span className="status-badge">{payment.status}</span>
                </div>
                <div className="project-grid">
                  <div className="project-row">
                    <span>Amount</span>
                    <strong>{formatAmount(payment.amount, payment.currency)}</strong>
                  </div>
                  <div className="project-row">
                    <span>Project</span>
                    <strong>
                      {payment.project?.title ??
                        payment.milestone?.project?.title ??
                        '-'}
                    </strong>
                  </div>
                  <div className="project-row">
                    <span>Milestone</span>
                    <strong>
                      {payment.milestone
                        ? `#${payment.milestone.sequence} ${payment.milestone.title}`
                        : '-'}
                    </strong>
                  </div>
                </div>
              </article>
            ))}
            {payments.length === 0 ? <p className="page-note">Odeme kaydi yok.</p> : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
