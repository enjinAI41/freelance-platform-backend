import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { Link, useParams } from 'react-router-dom'
import api from '../api/axios'
import { PageTitle } from '../components/PageTitle'
import { useAuth } from '../context/AuthContext'
import { projectsService } from '../api/projects.service'
import type { ApiEnvelope } from '../types/auth'
import type { Milestone, Project } from '../types/project'

type Delivery = {
  id: number
  milestoneId: number
  version: number
  submissionUrl: string
  note: string | null
  status: string
  revisionReason: string | null
  createdAt: string
}

type DeliveryDraft = {
  submissionUrl: string
  note: string
}

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

function formatAmount(amount: number | string, currency?: string | null): string {
  return `${currency ?? 'TRY'} ${amount}`
}

function statusClass(status: string): string {
  const value = status.toUpperCase()

  if (value === 'APPROVED' || value === 'COMPLETED') {
    return 'status-badge status-success'
  }

  if (value === 'REJECTED' || value === 'CANCELED') {
    return 'status-badge status-danger'
  }

  return 'status-badge status-pending'
}

function deliveryStatusClass(status: string): string {
  const value = status.toUpperCase()

  if (value === 'APPROVED') {
    return 'status-badge status-success'
  }

  if (value === 'REVISION_REQUESTED') {
    return 'status-badge status-danger'
  }

  return 'status-badge status-pending'
}

function unwrapResponse<T>(payload: T | ApiEnvelope<T>): T {
  if (payload !== null && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

type DeliveryItemProps = {
  delivery: Delivery
}

function DeliveryItem({ delivery }: DeliveryItemProps) {
  return (
    <article className="delivery-card">
      <div className="delivery-top">
        <strong>Version {delivery.version}</strong>
        <span className={deliveryStatusClass(delivery.status)}>{delivery.status}</span>
      </div>

      <p className="page-note">
        <a href={delivery.submissionUrl} target="_blank" rel="noreferrer">
          {delivery.submissionUrl}
        </a>
      </p>

      <p className="job-description">{delivery.note ?? 'Not yok.'}</p>
      {delivery.revisionReason ? (
        <p className="page-note">Revision: {delivery.revisionReason}</p>
      ) : null}
    </article>
  )
}

export function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const { user, token } = useAuth()
  const projectIdNumber = Number(params.id)
  const isValidProjectId = Number.isInteger(projectIdNumber)

  const [project, setProject] = useState<Project | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [deliveriesByMilestone, setDeliveriesByMilestone] = useState<
    Record<number, Delivery[]>
  >({})

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deliveryDrafts, setDeliveryDrafts] = useState<Record<number, DeliveryDraft>>({})
  const [revisionReasonByMilestone, setRevisionReasonByMilestone] = useState<
    Record<number, string>
  >({})
  const [refundReasonByMilestone, setRefundReasonByMilestone] = useState<
    Record<number, string>
  >({})
  const [milestoneMessage, setMilestoneMessage] = useState<
    Record<number, { success?: string; error?: string }>
  >({})
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  const roles = user?.roles ?? []
  const canCreateMilestone = Boolean(token) && roles.includes('CUSTOMER')
  const canCreateDelivery = Boolean(token) && roles.includes('FREELANCER')
  const canManageDelivery = Boolean(token) && roles.includes('CUSTOMER')
  const canViewDeliveries =
    Boolean(token) &&
    (roles.includes('CUSTOMER') || roles.includes('FREELANCER') || roles.includes('ARBITER'))

  const setMilestoneError = (milestoneId: number, message: string) => {
    setMilestoneMessage((prev) => ({ ...prev, [milestoneId]: { error: message } }))
  }

  const setMilestoneSuccess = (milestoneId: number, message: string) => {
    setMilestoneMessage((prev) => ({ ...prev, [milestoneId]: { success: message } }))
  }

  const loadDeliveriesForMilestone = useCallback(
    async (milestoneId: number) => {
      if (!canViewDeliveries) {
        return
      }

      const { data } = await api.get<ApiEnvelope<Delivery[]> | Delivery[]>(
        `/milestones/${milestoneId}/deliveries`,
      )

      setDeliveriesByMilestone((prev) => ({
        ...prev,
        [milestoneId]: unwrapResponse<Delivery[]>(data),
      }))
    },
    [canViewDeliveries],
  )

  const refreshMilestones = useCallback(async () => {
    if (!isValidProjectId) {
      return [] as Milestone[]
    }

    const updatedMilestones = await projectsService.listMilestones(projectIdNumber)
    setMilestones(updatedMilestones)
    return updatedMilestones
  }, [isValidProjectId, projectIdNumber])

  const loadProjectData = useCallback(
    async (projectId: number) => {
      const [detail, milestoneList] = await Promise.all([
        projectsService.getById(projectId),
        projectsService.listMilestones(projectId),
      ])

      setProject(detail)
      setMilestones(milestoneList)

      if (!canViewDeliveries || milestoneList.length === 0) {
        setDeliveriesByMilestone({})
        return
      }

      const deliveriesEntries = await Promise.all(
        milestoneList.map(async (milestone) => {
          const { data } = await api.get<ApiEnvelope<Delivery[]> | Delivery[]>(
            `/milestones/${milestone.id}/deliveries`,
          )

          return [milestone.id, unwrapResponse<Delivery[]>(data)] as const
        }),
      )

      setDeliveriesByMilestone(Object.fromEntries(deliveriesEntries))
    },
    [canViewDeliveries],
  )

  const handleCreateMilestone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsedAmount = Number(amount)

    if (!isValidProjectId) {
      setSubmitError('Gecersiz project id')
      return
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setSubmitError('Amount gecerli bir sayi olmali.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(null)

    try {
      const sequence = milestones.length + 1
      await projectsService.createMilestone(
        projectIdNumber,
        {
          title,
          description,
          amount: parsedAmount,
        },
        sequence,
      )

      setTitle('')
      setDescription('')
      setAmount('')
      setSubmitSuccess('Milestone basariyla olusturuldu.')

      const updatedMilestones = await refreshMilestones()
      if (canViewDeliveries) {
        await Promise.all(updatedMilestones.map((milestone) => loadDeliveriesForMilestone(milestone.id)))
      }
    } catch (err) {
      setSubmitError(getApiMessage(err, 'Milestone olusturulamadi.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeliveryDraftChange = (
    milestoneId: number,
    field: keyof DeliveryDraft,
    value: string,
  ) => {
    setDeliveryDrafts((prev) => ({
      ...prev,
      [milestoneId]: {
        ...(prev[milestoneId] ?? { submissionUrl: '', note: '' }),
        [field]: value,
      },
    }))
  }

  const handleCreateDelivery = async (event: FormEvent<HTMLFormElement>, milestoneId: number) => {
    event.preventDefault()

    const draft = deliveryDrafts[milestoneId]
    if (!draft?.submissionUrl?.trim()) {
      setMilestoneError(milestoneId, 'Submission URL zorunlu.')
      return
    }

    setPendingAction(`create-delivery-${milestoneId}`)
    setMilestoneMessage((prev) => ({ ...prev, [milestoneId]: {} }))

    try {
      await api.post(`/milestones/${milestoneId}/deliveries`, {
        submissionUrl: draft.submissionUrl.trim(),
        note: draft.note.trim() || undefined,
      })

      await refreshMilestones()
      await loadDeliveriesForMilestone(milestoneId)

      setDeliveryDrafts((prev) => ({
        ...prev,
        [milestoneId]: { submissionUrl: '', note: '' },
      }))
      setMilestoneSuccess(milestoneId, 'Delivery yüklendi.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Delivery yuklenemedi.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleApproveDelivery = async (milestoneId: number, deliveryId: number) => {
    setPendingAction(`approve-delivery-${deliveryId}`)
    setMilestoneMessage((prev) => ({ ...prev, [milestoneId]: {} }))

    try {
      await api.patch(`/deliveries/${deliveryId}/approve`)
      await refreshMilestones()
      await loadDeliveriesForMilestone(milestoneId)
      setMilestoneSuccess(milestoneId, 'Delivery onaylandi.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Delivery onaylanamadi.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleRequestRevision = async (milestoneId: number, deliveryId: number) => {
    const reason = revisionReasonByMilestone[milestoneId]?.trim() || 'Lutfen revize et.'

    setPendingAction(`revision-delivery-${deliveryId}`)
    setMilestoneMessage((prev) => ({ ...prev, [milestoneId]: {} }))

    try {
      await api.patch(`/deliveries/${deliveryId}/revision`, { reason })
      await refreshMilestones()
      await loadDeliveriesForMilestone(milestoneId)
      setMilestoneSuccess(milestoneId, 'Revision talebi gonderildi.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Revision talebi gonderilemedi.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleReleasePayment = async (milestoneId: number, paymentId: number) => {
    setPendingAction(`release-payment-${paymentId}`)
    setMilestoneMessage((prev) => ({ ...prev, [milestoneId]: {} }))

    try {
      await api.post(`/payments/${paymentId}/release`)
      await refreshMilestones()
      setMilestoneSuccess(milestoneId, 'Payment release edildi.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Payment release edilemedi.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleRefundPayment = async (milestoneId: number, paymentId: number) => {
    const reason = refundReasonByMilestone[milestoneId]?.trim()
    if (!reason) {
      setMilestoneError(milestoneId, 'Refund icin reason yazilmali.')
      return
    }

    setPendingAction(`refund-payment-${paymentId}`)
    setMilestoneMessage((prev) => ({ ...prev, [milestoneId]: {} }))

    try {
      await api.patch(`/payments/${paymentId}/refund`, { reason })
      await refreshMilestones()
      setMilestoneSuccess(milestoneId, 'Payment refunded.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Refund islemi basarisiz.'))
    } finally {
      setPendingAction(null)
    }
  }

  const latestDeliveryByMilestone = useMemo(() => {
    const latestMap: Record<number, Delivery | null> = {}

    milestones.forEach((milestone) => {
      const deliveries = deliveriesByMilestone[milestone.id] ?? []
      if (deliveries.length === 0) {
        latestMap[milestone.id] = null
        return
      }

      latestMap[milestone.id] = [...deliveries].sort((a, b) => b.version - a.version)[0]
    })

    return latestMap
  }, [milestones, deliveriesByMilestone])

  useEffect(() => {
    if (!isValidProjectId) {
      return
    }

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        await loadProjectData(projectIdNumber)
      } catch {
        setError('Proje detayi alinamadi.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [canViewDeliveries, isValidProjectId, loadProjectData, projectIdNumber])

  if (!isValidProjectId) {
    return (
      <section className="page-card">
        <PageTitle title="Project Detail" description="Proje ozeti ve milestone yonetimi" />
        <p className="page-note">Gecersiz project id</p>
        <p className="page-note">
          <Link to="/projects">Back to projects</Link>
        </p>
      </section>
    )
  }

  return (
    <section className="page-card">
      <PageTitle title="Project Detail" description="Proje ozeti ve milestone yonetimi" />

      {isLoading ? <p>Loading...</p> : null}
      {error ? <p className="page-note">{error}</p> : null}

      {!isLoading && !error && project ? (
        <>
          <article className="project-card">
            <h3>{project.jobListing?.title ?? project.title}</h3>
            <p className="job-description">{project.summary ?? 'Ozet yok.'}</p>

            <div className="project-grid">
              <div className="project-row">
                <span>Status</span>
                <span className="status-badge">{project.status}</span>
              </div>
              <div className="project-row">
                <span>Freelancer</span>
                <strong>{project.freelancer?.fullName ?? '-'}</strong>
              </div>
              <div className="project-row">
                <span>Customer</span>
                <strong>{project.customer?.fullName ?? '-'}</strong>
              </div>
              <div className="project-row">
                <span>Total Amount</span>
                <strong className="budget-pill">
                  {formatAmount(project.totalAmount, project.currency)}
                </strong>
              </div>
            </div>
          </article>

          <div className="jobs-header" style={{ marginTop: '20px' }}>
            <PageTitle title="Milestones" description="Proje asamalari" />
          </div>

          <div className="milestone-list">
            {milestones.map((milestone) => (
              <article className="milestone-card" key={milestone.id}>
                <div className="project-row">
                  <h3>
                    #{milestone.sequence} {milestone.title}
                  </h3>
                  <span className={statusClass(milestone.status)}>{milestone.status}</span>
                </div>
                <p className="job-description">{milestone.description ?? 'Aciklama yok.'}</p>
                <div className="job-meta">
                  <span className="budget-pill">
                    {formatAmount(milestone.amount, project.currency)}
                  </span>
                  <span>
                    Due: {milestone.dueDate ? new Date(milestone.dueDate).toLocaleDateString() : '-'}
                  </span>
                </div>

                <div className="delivery-section">
                  <h4>Deliveries</h4>

                  <div className="delivery-list">
                    {(deliveriesByMilestone[milestone.id] ?? []).map((delivery) => (
                      <DeliveryItem delivery={delivery} key={delivery.id} />
                    ))}
                    {(deliveriesByMilestone[milestone.id] ?? []).length === 0 ? (
                      <p className="page-note">Delivery yok.</p>
                    ) : null}
                  </div>

                  {canCreateDelivery ? (
                    <form
                      className="inline-form"
                      onSubmit={(event) => handleCreateDelivery(event, milestone.id)}
                    >
                      <div className="form-group">
                        <label htmlFor={`submission-url-${milestone.id}`}>Submission URL</label>
                        <input
                          id={`submission-url-${milestone.id}`}
                          value={deliveryDrafts[milestone.id]?.submissionUrl ?? ''}
                          onChange={(event) =>
                            handleDeliveryDraftChange(
                              milestone.id,
                              'submissionUrl',
                              event.target.value,
                            )
                          }
                          placeholder="https://..."
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor={`delivery-note-${milestone.id}`}>Note</label>
                        <textarea
                          id={`delivery-note-${milestone.id}`}
                          rows={3}
                          value={deliveryDrafts[milestone.id]?.note ?? ''}
                          onChange={(event) =>
                            handleDeliveryDraftChange(milestone.id, 'note', event.target.value)
                          }
                        />
                      </div>

                      <button
                        className="button button-subtle"
                        type="submit"
                        disabled={pendingAction === `create-delivery-${milestone.id}`}
                      >
                        {pendingAction === `create-delivery-${milestone.id}`
                          ? 'Uploading...'
                          : 'Upload Delivery'}
                      </button>
                    </form>
                  ) : null}

                  {canManageDelivery && latestDeliveryByMilestone[milestone.id] ? (
                    <div className="delivery-actions">
                      <button
                        className="button button-subtle"
                        type="button"
                        disabled={
                          pendingAction ===
                          `approve-delivery-${latestDeliveryByMilestone[milestone.id]?.id}`
                        }
                        onClick={() =>
                          handleApproveDelivery(
                            milestone.id,
                            latestDeliveryByMilestone[milestone.id]!.id,
                          )
                        }
                      >
                        Approve
                      </button>

                      <input
                        className="field-inline"
                        placeholder="Revision reason"
                        value={revisionReasonByMilestone[milestone.id] ?? ''}
                        onChange={(event) =>
                          setRevisionReasonByMilestone((prev) => ({
                            ...prev,
                            [milestone.id]: event.target.value,
                          }))
                        }
                      />

                      <button
                        className="button button-subtle"
                        type="button"
                        disabled={
                          pendingAction ===
                          `revision-delivery-${latestDeliveryByMilestone[milestone.id]?.id}`
                        }
                        onClick={() =>
                          handleRequestRevision(
                            milestone.id,
                            latestDeliveryByMilestone[milestone.id]!.id,
                          )
                        }
                      >
                        Request Revision
                      </button>
                    </div>
                  ) : null}

                  {canManageDelivery &&
                  milestone.status === 'APPROVED' &&
                  milestone.payment?.status === 'PENDING' ? (
                    <div className="delivery-actions">
                      <button
                        className="button"
                        type="button"
                        disabled={pendingAction === `release-payment-${milestone.payment.id}`}
                        onClick={() => handleReleasePayment(milestone.id, milestone.payment!.id)}
                      >
                        {pendingAction === `release-payment-${milestone.payment.id}`
                          ? 'Releasing...'
                          : 'Release Payment'}
                      </button>
                    </div>
                  ) : null}

                  {canManageDelivery && milestone.payment?.status === 'RELEASED' ? (
                    <div className="delivery-actions">
                      <input
                        className="field-inline"
                        placeholder="Refund reason"
                        value={refundReasonByMilestone[milestone.id] ?? ''}
                        onChange={(event) =>
                          setRefundReasonByMilestone((prev) => ({
                            ...prev,
                            [milestone.id]: event.target.value,
                          }))
                        }
                      />

                      <button
                        className="button button-subtle"
                        type="button"
                        disabled={pendingAction === `refund-payment-${milestone.payment.id}`}
                        onClick={() => handleRefundPayment(milestone.id, milestone.payment!.id)}
                      >
                        {pendingAction === `refund-payment-${milestone.payment.id}`
                          ? 'Refunding...'
                          : 'Refund'}
                      </button>
                    </div>
                  ) : null}

                  {milestone.payment ? (
                    <p className="page-note">
                      Payment: #{milestone.payment.id} ({milestone.payment.status})
                    </p>
                  ) : null}

                  {milestoneMessage[milestone.id]?.error ? (
                    <p className="page-note">{milestoneMessage[milestone.id]?.error}</p>
                  ) : null}
                  {milestoneMessage[milestone.id]?.success ? (
                    <p className="page-note">{milestoneMessage[milestone.id]?.success}</p>
                  ) : null}
                </div>
              </article>
            ))}
            {milestones.length === 0 ? <p>Henuz milestone yok.</p> : null}
          </div>

          {canCreateMilestone ? (
            <div className="page-card centered-form-card" style={{ marginTop: '16px' }}>
              <PageTitle title="Milestone Ekle" description="Sadece customer role olusturabilir" />

              <form onSubmit={handleCreateMilestone}>
                <div className="form-group">
                  <label htmlFor="milestoneTitle">Title</label>
                  <input
                    id="milestoneTitle"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    maxLength={180}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="milestoneDescription">Description</label>
                  <textarea
                    id="milestoneDescription"
                    rows={4}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="milestoneAmount">Amount</label>
                  <input
                    id="milestoneAmount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </div>

                <button className="button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Olusturuluyor...' : 'Milestone Olustur'}
                </button>

                {submitError ? <p className="page-note">{submitError}</p> : null}
                {submitSuccess ? <p className="page-note">{submitSuccess}</p> : null}
              </form>
            </div>
          ) : (
            <p className="page-note">Freelancer milestone olusturamaz, sadece goruntuler.</p>
          )}
        </>
      ) : null}

      <p className="page-note">
        <Link to="/projects">Back to projects</Link>
      </p>
    </section>
  )
}
