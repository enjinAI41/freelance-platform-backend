import { useEffect, useState } from 'react'
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

export function ArbiterDeskPage() {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const isArbiter = roles.includes('ARBITER')

  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [decisionNotes, setDecisionNotes] = useState<Record<number, string>>({})
  const [resolutions, setResolutions] = useState<Record<number, DisputeResolution>>({})

  const loadDisputes = async () => {
    try {
      setError(null)
      const data = await disputesService.list('OPEN')
      setDisputes(data)
    } catch (err) {
      setError(getApiMessage(err, 'Uyusmazlik listesi alinamadi.'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadDisputes()
  }, [])

  const handleAssign = async (disputeId: number) => {
    setPendingAction(`assign-${disputeId}`)
    setError(null)
    try {
      await disputesService.assign(disputeId)
      await loadDisputes()
    } catch (err) {
      setError(getApiMessage(err, 'Hakem atama islemi basarisiz.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleResolve = async (disputeId: number) => {
    const resolution = resolutions[disputeId] ?? 'NO_ACTION'
    const note = (decisionNotes[disputeId] ?? '').trim()
    if (!note) {
      setError('Karar notu bos olamaz.')
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

  if (!isArbiter) {
    return (
      <section className="page-card">
        <PageTitle title="Hakem Denetim Masasi" description="Sadece ARBITER rolune aciktir." />
        <p className="page-note">Bu ekran icin ARBITER rolune sahip olmalisin.</p>
      </section>
    )
  }

  return (
    <section className="page-card">
      <div className="jobs-header">
        <PageTitle title="Hakem Denetim Masasi" description="Aktif uyusmazliklari incele ve karar ver." />
        <button className="button button-subtle" type="button" onClick={() => void loadDisputes()}>
          Yenile
        </button>
      </div>

      {isLoading ? <p>Loading...</p> : null}
      {error ? <p className="page-note">{error}</p> : null}

      {!isLoading ? (
        <div className="milestone-list">
          {disputes.map((dispute) => {
            const assignedToMe = Boolean(dispute.assignedArbiter)
            return (
              <article key={dispute.id} className="milestone-card">
                <div className="project-row">
                  <h3>Dispute #{dispute.id}</h3>
                  <span className="status-badge status-pending">{dispute.status}</span>
                </div>

                <p className="job-description">{dispute.reason}</p>
                <div className="project-grid">
                  <div className="project-row">
                    <span>Project</span>
                    <strong>{dispute.project?.title ?? `#${dispute.projectId}`}</strong>
                  </div>
                  <div className="project-row">
                    <span>Milestone</span>
                    <strong>{dispute.milestone ? `#${dispute.milestone.sequence}` : '-'}</strong>
                  </div>
                  <div className="project-row">
                    <span>Assigned Arbiter</span>
                    <strong>{dispute.assignedArbiter?.fullName ?? 'Atanmadi'}</strong>
                  </div>
                </div>

                {!assignedToMe ? (
                  <div className="delivery-actions">
                    <button
                      className="button button-subtle"
                      type="button"
                      disabled={pendingAction === `assign-${dispute.id}`}
                      onClick={() => void handleAssign(dispute.id)}
                    >
                      {pendingAction === `assign-${dispute.id}` ? 'Ataniyor...' : 'Kendime Ata'}
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
                          {option}
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
                      {pendingAction === `resolve-${dispute.id}` ? 'Kaydediliyor...' : 'Karar Ver'}
                    </button>
                  </div>
                ) : null}
              </article>
            )
          })}
          {disputes.length === 0 ? <p className="page-note">Aktif uyusmazlik yok.</p> : null}
        </div>
      ) : null}
    </section>
  )
}
