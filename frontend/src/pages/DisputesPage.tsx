import { useCallback, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { Link } from 'react-router-dom'
import { PageTitle } from '../components/PageTitle'
import { disputesService } from '../api/disputes.service'
import { useAuth } from '../context/AuthContext'
import type { Dispute, DisputeStatus } from '../types/dispute'

type DisputeFilter = 'ALL' | DisputeStatus

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

function getStatusLabel(status: string): string {
  const value = status.toUpperCase()

  if (value === 'OPEN') {
    return 'Açık'
  }

  if (value === 'RESOLVED') {
    return 'Çözüldü'
  }

  if (value === 'CANCELED' || value === 'CANCELLED') {
    return 'İptal Edildi'
  }

  return status
}

function getResolutionLabel(value?: string | null): string {
  const option = value?.toUpperCase()

  if (!option) {
    return '-'
  }

  if (option === 'RELEASE_PAYMENT') {
    return 'Ödeme Serbest'
  }

  if (option === 'REFUND_PAYMENT') {
    return 'Tam İade'
  }

  if (option === 'PARTIAL_REFUND') {
    return 'Kısmi İade'
  }

  if (option === 'NO_ACTION') {
    return 'İşlem Yok'
  }

  return value ?? '-'
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('tr-TR')
}

export function DisputesPage() {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const isArbiter = roles.includes('ARBITER')

  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<DisputeFilter>(isArbiter ? 'OPEN' : 'ALL')
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const loadDisputes = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const status = filter === 'ALL' ? undefined : filter
      const data = await disputesService.list(status)
      setDisputes(data)
    } catch (err) {
      setError(getApiMessage(err, 'Uyuşmazlık kayıtları alınamadı.'))
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  const handleCancel = async (disputeId: number) => {
    setPendingAction(`cancel-${disputeId}`)
    setError(null)

    try {
      await disputesService.cancel(disputeId)
      await loadDisputes()
    } catch (err) {
      setError(getApiMessage(err, 'Uyuşmazlık kaydı iptal edilemedi.'))
    } finally {
      setPendingAction(null)
    }
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadDisputes()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [loadDisputes])

  const metrics = useMemo(() => {
    const open = disputes.filter((dispute) => dispute.status.toUpperCase() === 'OPEN').length
    const resolved = disputes.filter((dispute) => dispute.status.toUpperCase() === 'RESOLVED').length
    const canceled = disputes.filter((dispute) => {
      const status = dispute.status.toUpperCase()
      return status === 'CANCELED' || status === 'CANCELLED'
    }).length

    return {
      total: disputes.length,
      open,
      resolved,
      canceled,
    }
  }, [disputes])

  if (roles.length === 0) {
    return (
      <section className="page-card">
        <PageTitle title="Uyuşmazlıklar" description="Bu ekran için oturum açman gerekiyor." />
      </section>
    )
  }

  return (
    <section className="page-card">
      <div className="jobs-header">
        <PageTitle
          title="Uyuşmazlıklar"
          description={
            isArbiter
              ? 'Tüm uyuşmazlık kayıtlarını durum bazında izle.'
              : 'Açtığın veya dahil olduğun uyuşmazlıkları takip et.'
          }
        />
        <button className="button button-subtle" type="button" onClick={() => void loadDisputes()}>
          Yenile
        </button>
      </div>

      <div className="panel-metric-grid">
        <article className="metric-tile">
          <span>Toplam Kayıt</span>
          <strong>{isLoading ? '...' : metrics.total}</strong>
        </article>
        <article className="metric-tile">
          <span>Açık</span>
          <strong>{isLoading ? '...' : metrics.open}</strong>
        </article>
        <article className="metric-tile">
          <span>Çözülen</span>
          <strong>{isLoading ? '...' : metrics.resolved}</strong>
        </article>
        <article className="metric-tile">
          <span>İptal</span>
          <strong>{isLoading ? '...' : metrics.canceled}</strong>
        </article>
      </div>

      <div className="delivery-actions panel-actions">
        <button
          className={`button button-subtle ${filter === 'ALL' ? 'filter-active' : ''}`.trim()}
          type="button"
          onClick={() => setFilter('ALL')}
        >
          Tümü
        </button>
        <button
          className={`button button-subtle ${filter === 'OPEN' ? 'filter-active' : ''}`.trim()}
          type="button"
          onClick={() => setFilter('OPEN')}
        >
          Açık
        </button>
        <button
          className={`button button-subtle ${filter === 'RESOLVED' ? 'filter-active' : ''}`.trim()}
          type="button"
          onClick={() => setFilter('RESOLVED')}
        >
          Çözüldü
        </button>
        <button
          className={`button button-subtle ${filter === 'CANCELED' ? 'filter-active' : ''}`.trim()}
          type="button"
          onClick={() => setFilter('CANCELED')}
        >
          İptal
        </button>
      </div>

      {isLoading ? <p>Yükleniyor...</p> : null}
      {error ? <p className="page-note">{error}</p> : null}

      {!isLoading ? (
        <div className="milestone-list">
          {disputes.map((dispute) => (
            <article key={dispute.id} className="milestone-card arbiter-dispute-card">
              <div className="project-row">
                <h3>Uyuşmazlık #{dispute.id}</h3>
                <span className="status-badge status-pending">{getStatusLabel(dispute.status)}</span>
              </div>

              <p className="job-description">
                <strong>Gerekçe:</strong> {dispute.reason}
              </p>

              <div className="project-grid">
                <div className="project-row">
                  <span>Proje</span>
                  <strong>{dispute.project?.title ?? `#${dispute.projectId}`}</strong>
                </div>
                <div className="project-row">
                  <span>Milestone</span>
                  <strong>{dispute.milestone ? `#${dispute.milestone.sequence}` : '-'}</strong>
                </div>
                <div className="project-row">
                  <span>Açan Kullanıcı</span>
                  <strong>{dispute.openedBy?.fullName ?? '-'}</strong>
                </div>
                <div className="project-row">
                  <span>Atanan Hakem</span>
                  <strong>{dispute.assignedArbiter?.fullName ?? 'Atanmadı'}</strong>
                </div>
                <div className="project-row">
                  <span>Karar</span>
                  <strong>{getResolutionLabel(dispute.resolution)}</strong>
                </div>
                <div className="project-row">
                  <span>Açılış</span>
                  <strong>{formatDate(dispute.createdAt)}</strong>
                </div>
              </div>

              {dispute.resolutionNote ? (
                <p className="page-note">
                  <strong>Karar Notu:</strong> {dispute.resolutionNote}
                </p>
              ) : null}

              {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 ? (
                <div className="arbiter-evidence">
                  <strong>Kanıt Bağlantıları</strong>
                  <div className="arbiter-evidence-list">
                    {dispute.evidenceUrls.map((url) => (
                      <a href={url} target="_blank" rel="noreferrer" key={url}>
                        {url}
                      </a>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="delivery-actions">
                <Link className="button button-subtle" to={`/projects/${dispute.projectId}`}>
                  Projeye Git
                </Link>

                {!isArbiter && dispute.status.toUpperCase() === 'OPEN' ? (
                  <button
                    className="button button-subtle"
                    type="button"
                    disabled={pendingAction === `cancel-${dispute.id}`}
                    onClick={() => void handleCancel(dispute.id)}
                  >
                    {pendingAction === `cancel-${dispute.id}` ? 'İptal Ediliyor...' : 'Kaydı İptal Et'}
                  </button>
                ) : null}
              </div>
            </article>
          ))}

          {disputes.length === 0 ? (
            <p className="page-note">Bu filtrede gösterilecek uyuşmazlık kaydı yok.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
