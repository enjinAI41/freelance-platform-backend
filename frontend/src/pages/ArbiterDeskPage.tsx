import { useCallback, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { PageTitle } from '../components/PageTitle'
import { disputesService } from '../api/disputes.service'
import { useAuth } from '../context/AuthContext'
import type { Dispute, DisputeResolution } from '../types/dispute'

const resolutionOptions: DisputeResolution[] = [
  'NO_ACTION',
  'RELEASE_PAYMENT',
  'REFUND_PAYMENT',
  'PARTIAL_REFUND',
]

type ArbiterFilter = 'ALL' | 'UNASSIGNED' | 'ASSIGNED_TO_ME'

function getDisputeStatusLabel(status: string): string {
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

function getResolutionLabel(option: DisputeResolution): string {
  if (option === 'NO_ACTION') {
    return 'İşlem Yok'
  }

  if (option === 'RELEASE_PAYMENT') {
    return 'Ödemeyi Serbest Bırak'
  }

  if (option === 'REFUND_PAYMENT') {
    return 'Tam İade'
  }

  return 'Kısmi İade'
}

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

function formatDate(date: string): string {
  return new Date(date).toLocaleString('tr-TR')
}

export function ArbiterDeskPage() {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const isArbiter = roles.includes('ARBITER')
  const userId = user?.id !== undefined ? Number(user.id) : null

  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [decisionNotes, setDecisionNotes] = useState<Record<number, string>>({})
  const [resolutions, setResolutions] = useState<Record<number, DisputeResolution>>({})
  const [activeFilter, setActiveFilter] = useState<ArbiterFilter>('ALL')

  const loadDisputes = useCallback(async () => {
    try {
      setError(null)
      const data = await disputesService.list('OPEN')
      setDisputes(data)
    } catch (err) {
      setError(getApiMessage(err, 'Uyuşmazlık listesi alınamadı.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadDisputes()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [loadDisputes])

  const handleAssign = async (disputeId: number) => {
    setPendingAction(`assign-${disputeId}`)
    setError(null)
    try {
      await disputesService.assign(disputeId)
      await loadDisputes()
    } catch (err) {
      setError(getApiMessage(err, 'Hakem atama işlemi başarısız.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleResolve = async (disputeId: number) => {
    const resolution = resolutions[disputeId] ?? 'NO_ACTION'
    const note = (decisionNotes[disputeId] ?? '').trim()
    if (!note) {
      setError('Karar notu boş olamaz.')
      return
    }

    setPendingAction(`resolve-${disputeId}`)
    setError(null)
    try {
      await disputesService.resolve(disputeId, resolution, note)
      await loadDisputes()
    } catch (err) {
      setError(getApiMessage(err, 'Karar kaydedilemedi.'))
    } finally {
      setPendingAction(null)
    }
  }

  const openDisputes = useMemo(
    () => disputes.filter((dispute) => dispute.status.toUpperCase() === 'OPEN'),
    [disputes],
  )

  const unassignedCount = useMemo(
    () => openDisputes.filter((dispute) => !dispute.assignedArbiter).length,
    [openDisputes],
  )

  const assignedToMeCount = useMemo(
    () =>
      openDisputes.filter((dispute) => {
        if (userId === null || !Number.isFinite(userId)) {
          return false
        }

        return dispute.assignedArbiter?.id === userId
      }).length,
    [openDisputes, userId],
  )

  const filteredDisputes = useMemo(() => {
    if (activeFilter === 'UNASSIGNED') {
      return openDisputes.filter((dispute) => !dispute.assignedArbiter)
    }

    if (activeFilter === 'ASSIGNED_TO_ME') {
      return openDisputes.filter((dispute) => dispute.assignedArbiter?.id === userId)
    }

    return openDisputes
  }, [activeFilter, openDisputes, userId])

  if (!isArbiter) {
    return (
      <section className="page-card">
        <PageTitle title="Hakem Denetim Masası" description="Sadece Hakem rolüne açıktır." />
        <p className="page-note">Bu ekran için hesap rolün Hakem olmalı.</p>
      </section>
    )
  }

  return (
    <section className="page-card">
      <div className="jobs-header">
        <PageTitle
          title="Hakem Denetim Masası"
          description="Açık uyuşmazlıkları sırala, üzerine al ve kayıt altına alarak karara bağla."
        />
        <button className="button button-subtle" type="button" onClick={() => void loadDisputes()}>
          Yenile
        </button>
      </div>

      <div className="panel-metric-grid">
        <article className="metric-tile">
          <span>Açık Uyuşmazlık</span>
          <strong>{isLoading ? '...' : openDisputes.length}</strong>
        </article>
        <article className="metric-tile">
          <span>Atanmamış Kayıt</span>
          <strong>{isLoading ? '...' : unassignedCount}</strong>
        </article>
        <article className="metric-tile">
          <span>Bana Atanan</span>
          <strong>{isLoading ? '...' : assignedToMeCount}</strong>
        </article>
      </div>

      <div className="delivery-actions panel-actions">
        <button
          className={`button button-subtle ${activeFilter === 'ALL' ? 'filter-active' : ''}`}
          type="button"
          onClick={() => setActiveFilter('ALL')}
        >
          Tümü
        </button>
        <button
          className={`button button-subtle ${activeFilter === 'UNASSIGNED' ? 'filter-active' : ''}`}
          type="button"
          onClick={() => setActiveFilter('UNASSIGNED')}
        >
          Atanmamış
        </button>
        <button
          className={`button button-subtle ${activeFilter === 'ASSIGNED_TO_ME' ? 'filter-active' : ''}`}
          type="button"
          onClick={() => setActiveFilter('ASSIGNED_TO_ME')}
        >
          Bana Atanan
        </button>
      </div>

      {isLoading ? <p>Yükleniyor...</p> : null}
      {error ? <p className="page-note">{error}</p> : null}

      {!isLoading ? (
        <div className="milestone-list">
          {filteredDisputes.map((dispute) => {
            const assignedToMe = dispute.assignedArbiter?.id === userId
            return (
              <article key={dispute.id} className="milestone-card arbiter-dispute-card">
                <div className="project-row">
                  <h3>Uyuşmazlık #{dispute.id}</h3>
                  <span className="status-badge status-pending">{getDisputeStatusLabel(dispute.status)}</span>
                </div>

                <p className="job-description">
                  <strong>Uyuşmazlık Gerekçesi:</strong> {dispute.reason}
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
                    <span>Atanan Hakem</span>
                    <strong>{dispute.assignedArbiter?.fullName ?? 'Atanmadı'}</strong>
                  </div>
                  <div className="project-row">
                    <span>Uyuşmazlığı Açan</span>
                    <strong>{dispute.openedBy?.fullName ?? '-'}</strong>
                  </div>
                  <div className="project-row">
                    <span>Açılış Zamanı</span>
                    <strong>{formatDate(dispute.createdAt)}</strong>
                  </div>
                </div>

                {dispute.evidenceUrls && dispute.evidenceUrls.length > 0 ? (
                  <div className="arbiter-evidence">
                    <strong>Eklenen Deliller</strong>
                    <div className="arbiter-evidence-list">
                      {dispute.evidenceUrls.map((url) => (
                        <a href={url} target="_blank" rel="noreferrer" key={url}>
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}

                {!assignedToMe ? (
                  <div className="delivery-actions">
                    <button
                      className="button button-subtle"
                      type="button"
                      disabled={Boolean(dispute.assignedArbiter) || pendingAction === `assign-${dispute.id}`}
                      onClick={() => void handleAssign(dispute.id)}
                    >
                      {pendingAction === `assign-${dispute.id}`
                        ? 'Atanıyor...'
                        : dispute.assignedArbiter
                          ? 'Başka Hakeme Atanmış'
                          : 'Kendime Ata'}
                    </button>
                  </div>
                ) : null}

                {assignedToMe ? (
                  <div className="delivery-actions">
                    <select
                      className="field-inline"
                      value={resolutions[dispute.id] ?? 'NO_ACTION'}
                      onChange={(event) =>
                        setResolutions((prev) => ({
                          ...prev,
                          [dispute.id]: event.target.value as DisputeResolution,
                        }))
                      }
                    >
                      {resolutionOptions.map((option) => (
                        <option key={option} value={option}>
                          {getResolutionLabel(option)}
                        </option>
                      ))}
                    </select>
                    <input
                      className="field-inline"
                      placeholder="Karar notu"
                      value={decisionNotes[dispute.id] ?? ''}
                      onChange={(event) =>
                        setDecisionNotes((prev) => ({
                          ...prev,
                          [dispute.id]: event.target.value,
                        }))
                      }
                    />
                    <button
                      className="button"
                      type="button"
                      disabled={pendingAction === `resolve-${dispute.id}`}
                      onClick={() => void handleResolve(dispute.id)}
                    >
                      {pendingAction === `resolve-${dispute.id}` ? 'Kaydediliyor...' : 'Kararı Kaydet'}
                    </button>
                  </div>
                ) : null}
              </article>
            )
          })}
          {filteredDisputes.length === 0 ? (
            <p className="page-note">Bu filtre için gösterilecek uyuşmazlık bulunmuyor.</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
