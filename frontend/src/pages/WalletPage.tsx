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

function getPaymentStatusLabel(status: string): string {
  const value = status.toUpperCase()

  if (value === 'PENDING') {
    return 'Beklemede'
  }

  if (value === 'RELEASED') {
    return 'Serbest Bırakıldı'
  }

  if (value === 'REFUNDED') {
    return 'İade Edildi'
  }

  return status
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
        setError(getApiMessage(err, 'Ödeme bilgileri alınamadı.'))
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  return (
    <section className="page-card">
      <PageTitle title="Cüzdan ve Ödemeler" description="Cüzdan özeti ve ödeme geçmişi" />

      {isLoading ? <p>Yükleniyor...</p> : null}
      {error ? <p className="page-note">{error}</p> : null}

      {!isLoading && !error && summary ? (
        <>
          <div className="stats-grid">
            <article className="stat-card">
              <span>Bekleyen</span>
              <strong>{formatAmount(summary.pendingAmount, summary.currency)}</strong>
            </article>
            <article className="stat-card">
              <span>Serbest Bırakılan</span>
              <strong>{formatAmount(summary.releasedAmount, summary.currency)}</strong>
            </article>
            <article className="stat-card">
              <span>İade Edilen</span>
              <strong>{formatAmount(summary.refundedAmount, summary.currency)}</strong>
            </article>
            <article className="stat-card">
              <span>Toplam Kayıt</span>
              <strong>{summary.totalRecords}</strong>
            </article>
          </div>

          <div className="jobs-header" style={{ marginTop: '18px' }}>
            <PageTitle title="Ödeme Geçmişi" description="Tüm ödeme hareketleri" />
          </div>

          <div className="milestone-list">
            {payments.map((payment) => (
              <article className="milestone-card" key={payment.id}>
                <div className="project-row">
                  <h3>Ödeme #{payment.id}</h3>
                  <span className="status-badge">{getPaymentStatusLabel(payment.status)}</span>
                </div>
                <div className="project-grid">
                  <div className="project-row">
                    <span>Tutar</span>
                    <strong>{formatAmount(payment.amount, payment.currency)}</strong>
                  </div>
                  <div className="project-row">
                    <span>Proje</span>
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
            {payments.length === 0 ? <p className="page-note">Ödeme kaydı yok.</p> : null}
          </div>
        </>
      ) : null}
    </section>
  )
}
