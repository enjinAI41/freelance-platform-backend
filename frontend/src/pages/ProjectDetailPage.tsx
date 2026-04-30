import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { Link, useParams } from 'react-router-dom'
import api from '../api/axios'
import { PageTitle } from '../components/PageTitle'
import { useAuth } from '../context/AuthContext'
import { disputesService } from '../api/disputes.service'
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

type ProjectReview = {
  id: number
  projectId: number
  reviewerId: number
  revieweeId: number
  rating: number
  comment: string | null
  createdAt: string
  reviewer?: {
    id: number
    fullName: string
    email: string
  }
  reviewee?: {
    id: number
    fullName: string
    email: string
  }
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

function getStatusLabel(status: string): string {
  const value = status.toUpperCase()

  if (value === 'PENDING') {
    return 'Beklemede'
  }

  if (value === 'IN_PROGRESS') {
    return 'Devam Ediyor'
  }

  if (value === 'ACTIVE') {
    return 'Aktif'
  }

  if (value === 'APPROVED') {
    return 'OnaylandÄ±'
  }

  if (value === 'COMPLETED') {
    return 'TamamlandÄ±'
  }

  if (value === 'REVISION_REQUESTED') {
    return 'Revizyon Ä°stendi'
  }

  if (value === 'REJECTED') {
    return 'Reddedildi'
  }

  if (value === 'CANCELED' || value === 'CANCELLED') {
    return 'Ä°ptal Edildi'
  }

  if (value === 'RELEASED') {
    return 'Serbest BÄ±rakÄ±ldÄ±'
  }

  if (value === 'REFUNDED') {
    return 'Ä°ade Edildi'
  }

  return status
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
        <strong>SÃ¼rÃ¼m {delivery.version}</strong>
        <span className={deliveryStatusClass(delivery.status)}>{getStatusLabel(delivery.status)}</span>
      </div>

      <p className="page-note">
        <a href={delivery.submissionUrl} target="_blank" rel="noreferrer">
          {delivery.submissionUrl}
        </a>
      </p>

      <p className="job-description">{delivery.note ?? 'Not yok.'}</p>
      {delivery.revisionReason ? (
        <p className="page-note">Revizyon: {delivery.revisionReason}</p>
      ) : null}
    </article>
  )
}

export function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const { user, token } = useAuth()
  const currentUserId = user?.id !== undefined ? Number(user.id) : null
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
  const [selectedDeliveryMilestoneId, setSelectedDeliveryMilestoneId] = useState<number | null>(null)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeMilestoneId, setDisputeMilestoneId] = useState('')
  const [disputeEvidenceUrls, setDisputeEvidenceUrls] = useState('')
  const [disputeError, setDisputeError] = useState<string | null>(null)
  const [disputeSuccess, setDisputeSuccess] = useState<string | null>(null)
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false)
  const [reviews, setReviews] = useState<ProjectReview[]>([])
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null)
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  const roles = user?.roles ?? []
  const canCreateMilestone = Boolean(token) && roles.includes('CUSTOMER')
  const canCreateDelivery = Boolean(token) && roles.includes('FREELANCER')
  const canManageDelivery = Boolean(token) && roles.includes('CUSTOMER')
  const canCreateDispute =
    Boolean(token) && (roles.includes('CUSTOMER') || roles.includes('FREELANCER'))
  const canViewDeliveries =
    Boolean(token) &&
    (roles.includes('CUSTOMER') || roles.includes('FREELANCER') || roles.includes('ARBITER'))
  const canCreateReview =
    Boolean(token) && (roles.includes('CUSTOMER') || roles.includes('FREELANCER'))
  const canViewReviews = canViewDeliveries

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

  const loadReviews = useCallback(async () => {
    if (!isValidProjectId || !canViewReviews) {
      setReviews([])
      return
    }

    try {
      const data = await projectsService.listReviews(projectIdNumber)
      setReviews(data)
    } catch {
      setReviews([])
    }
  }, [canViewReviews, isValidProjectId, projectIdNumber])

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
      setSubmitError('GeÃ§ersiz proje kimliÄŸi.')
      return
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setSubmitError('Tutar geÃ§erli bir sayÄ± olmalÄ±.')
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
      setSubmitSuccess('Milestone baÅŸarÄ±yla oluÅŸturuldu.')

      const updatedMilestones = await refreshMilestones()
      if (canViewDeliveries) {
        await Promise.all(updatedMilestones.map((milestone) => loadDeliveriesForMilestone(milestone.id)))
      }
    } catch (err) {
      setSubmitError(getApiMessage(err, 'Milestone oluÅŸturulamadÄ±.'))
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
      setMilestoneError(milestoneId, "Teslim URL'si zorunlu.")
      return
    }

    try {
      // Teslim baÄŸlantÄ±sÄ±nÄ±n geÃ§erli bir URL olmasÄ± gerekir.
      new URL(draft.submissionUrl.trim())
    } catch {
      setMilestoneError(milestoneId, "GeÃ§erli bir URL gir (Ã¶r. https://...).")
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
      setMilestoneSuccess(milestoneId, 'Teslim yÃ¼klendi.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Teslim yÃ¼klenemedi.'))
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
      setMilestoneSuccess(milestoneId, 'Teslim onaylandÄ±.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Teslim onaylanamadÄ±.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleRequestRevision = async (milestoneId: number, deliveryId: number) => {
    const reason = revisionReasonByMilestone[milestoneId]?.trim() || 'LÃ¼tfen revize et.'

    setPendingAction(`revision-delivery-${deliveryId}`)
    setMilestoneMessage((prev) => ({ ...prev, [milestoneId]: {} }))

    try {
      await api.patch(`/deliveries/${deliveryId}/revision`, { reason })
      await refreshMilestones()
      await loadDeliveriesForMilestone(milestoneId)
      setMilestoneSuccess(milestoneId, 'Revizyon talebi gÃ¶nderildi.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Revizyon talebi gÃ¶nderilemedi.'))
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
      setMilestoneSuccess(milestoneId, 'Ã–deme serbest bÄ±rakÄ±ldÄ±.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Ã–deme serbest bÄ±rakÄ±lamadÄ±.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleRefundPayment = async (milestoneId: number, paymentId: number) => {
    const reason = refundReasonByMilestone[milestoneId]?.trim()
    if (!reason) {
      setMilestoneError(milestoneId, 'Ä°ade iÃ§in gerekÃ§e yazÄ±lmalÄ±.')
      return
    }

    setPendingAction(`refund-payment-${paymentId}`)
    setMilestoneMessage((prev) => ({ ...prev, [milestoneId]: {} }))

    try {
      await api.patch(`/payments/${paymentId}/refund`, { reason })
      await refreshMilestones()
      setMilestoneSuccess(milestoneId, 'Ã–deme iadesi tamamlandÄ±.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Ä°ade iÅŸlemi baÅŸarÄ±sÄ±z.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleCreateDispute = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const reason = disputeReason.trim()
    if (!reason) {
      setDisputeError('UyuÅŸmazlÄ±k gerekÃ§esi boÅŸ olamaz.')
      return
    }

    let milestoneId: number | undefined
    if (disputeMilestoneId.trim()) {
      const parsedMilestoneId = Number(disputeMilestoneId)
      if (!Number.isInteger(parsedMilestoneId) || parsedMilestoneId < 1) {
        setDisputeError('Milestone seÃ§imi geÃ§ersiz.')
        return
      }
      milestoneId = parsedMilestoneId
    }

    const evidenceUrls = disputeEvidenceUrls
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean)

    for (const url of evidenceUrls) {
      try {
        new URL(url)
      } catch {
        setDisputeError(`GeÃ§ersiz kanÄ±t baÄŸlantÄ±sÄ±: ${url}`)
        return
      }
    }

    setIsSubmittingDispute(true)
    setDisputeError(null)
    setDisputeSuccess(null)

    try {
      await disputesService.create(projectIdNumber, {
        reason,
        milestoneId,
        evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
      })
      setDisputeReason('')
      setDisputeMilestoneId('')
      setDisputeEvidenceUrls('')
      setDisputeSuccess('UyuÅŸmazlÄ±k kaydÄ± oluÅŸturuldu.')
      await loadProjectData(projectIdNumber)
    } catch (err) {
      setDisputeError(getApiMessage(err, 'UyuÅŸmazlÄ±k kaydÄ± oluÅŸturulamadÄ±.'))
    } finally {
      setIsSubmittingDispute(false)
    }
  }

  const handleCreateReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsedRating = Number(reviewRating)
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      setReviewError('Puan 1 ile 5 arasÄ±nda olmalÄ±dÄ±r.')
      return
    }

    setIsSubmittingReview(true)
    setReviewError(null)
    setReviewSuccess(null)

    try {
      await projectsService.createReview(projectIdNumber, {
        rating: parsedRating,
        comment: reviewComment.trim() || undefined,
      })
      setReviewComment('')
      setReviewRating('5')
      setReviewSuccess('DeÄŸerlendirmen kaydedildi.')
      await loadReviews()
    } catch (err) {
      setReviewError(getApiMessage(err, 'DeÄŸerlendirme kaydedilemedi.'))
    } finally {
      setIsSubmittingReview(false)
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

  const freelancerOpenMilestones = useMemo(
    () =>
      milestones.filter((milestone) => {
        const status = milestone.status.toUpperCase()
        return status !== 'APPROVED' && status !== 'COMPLETED' && status !== 'CANCELED'
      }),
    [milestones],
  )

  const freelancerApprovedMilestones = useMemo(
    () =>
      milestones.filter((milestone) => {
        const status = milestone.status.toUpperCase()
        return status === 'APPROVED' || status === 'COMPLETED'
      }),
    [milestones],
  )

  const freelancerRevisionMilestones = useMemo(
    () =>
      milestones.filter(
        (milestone) => milestone.status.toUpperCase() === 'REVISION_REQUESTED',
      ),
    [milestones],
  )

  const selectedDeliveryMilestone = useMemo(() => {
    if (!canCreateDelivery) {
      return null
    }

    if (selectedDeliveryMilestoneId) {
      const selected = milestones.find((milestone) => milestone.id === selectedDeliveryMilestoneId)
      if (selected) {
        return selected
      }
    }

    return freelancerOpenMilestones[0] ?? null
  }, [canCreateDelivery, freelancerOpenMilestones, milestones, selectedDeliveryMilestoneId])

  const hasSubmittedReview = useMemo(() => {
    if (!project || currentUserId === null || !Number.isFinite(currentUserId)) {
      return false
    }

    return reviews.some((review) => {
      if (review.reviewerId !== currentUserId) {
        return false
      }

      const counterpartId =
        currentUserId === project.customerId ? project.freelancerId : project.customerId

      return review.revieweeId === counterpartId
    })
  }, [currentUserId, project, reviews])

  const canSubmitReview =
    canCreateReview && project?.status.toUpperCase() === 'COMPLETED' && !hasSubmittedReview

  useEffect(() => {
    if (!isValidProjectId) {
      return
    }

    const load = async () => {
      try {
        setIsLoading(true)
        setError(null)
        await loadProjectData(projectIdNumber)
        await loadReviews()
      } catch {
        setError('Proje detayÄ± alÄ±namadÄ±.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [canViewDeliveries, isValidProjectId, loadProjectData, loadReviews, projectIdNumber])

  if (!isValidProjectId) {
    return (
      <section className="page-card">
        <PageTitle title="Proje DetayÄ±" description="Proje Ã¶zeti ve milestone yÃ¶netimi" />
        <p className="page-note">GeÃ§ersiz proje kimliÄŸi.</p>
        <p className="page-note">
          <Link to="/projects">Projelere dÃ¶n</Link>
        </p>
      </section>
    )
  }

  return (
    <section className="page-card">
      <PageTitle title="Proje DetayÄ±" description="Proje Ã¶zeti ve milestone yÃ¶netimi" />

      {isLoading ? <p>YÃ¼kleniyor...</p> : null}
      {error ? <p className="page-note">{error}</p> : null}

      {!isLoading && !error && project ? (
        <>
          <article className="project-card">
            <h3>{project.jobListing?.title ?? project.title}</h3>
            <p className="job-description">{project.summary ?? 'Ã–zet yok.'}</p>

            <div className="project-grid">
              <div className="project-row">
                <span>Durum</span>
                <span className="status-badge">{getStatusLabel(project.status)}</span>
              </div>
              <div className="project-row">
                <span>Freelancer</span>
                <strong>{project.freelancer?.fullName ?? '-'}</strong>
              </div>
              <div className="project-row">
                <span>MÃ¼ÅŸteri</span>
                <strong>{project.customer?.fullName ?? '-'}</strong>
              </div>
              <div className="project-row">
                <span>Toplam Tutar</span>
                <strong className="budget-pill">
                  {formatAmount(project.totalAmount, project.currency)}
                </strong>
              </div>
            </div>
          </article>

          {canCreateDispute ? (
            <div className="page-card centered-form-card" style={{ marginTop: '14px' }}>
              <PageTitle
                title="UyuÅŸmazlÄ±k KaydÄ± OluÅŸtur"
                description="GerekÃ§eyi ve varsa kanÄ±t baÄŸlantÄ±larÄ±nÄ± ekleyerek inceleme sÃ¼recini baÅŸlat."
              />

              <form onSubmit={handleCreateDispute}>
                <div className="form-group">
                  <label htmlFor="disputeReason">UyuÅŸmazlÄ±k GerekÃ§esi</label>
                  <textarea
                    id="disputeReason"
                    rows={4}
                    value={disputeReason}
                    onChange={(event) => setDisputeReason(event.target.value)}
                    placeholder="KarÅŸÄ±laÅŸtÄ±ÄŸÄ±n sorunu aÃ§Ä±k ve net bir ÅŸekilde yaz."
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="disputeMilestoneId">Ä°lgili Milestone (Opsiyonel)</label>
                  <select
                    id="disputeMilestoneId"
                    value={disputeMilestoneId}
                    onChange={(event) => setDisputeMilestoneId(event.target.value)}
                  >
                    <option value="">Proje Genelinde UyuÅŸmazlÄ±k</option>
                    {milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        #{milestone.sequence} {milestone.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="disputeEvidenceUrls">KanÄ±t BaÄŸlantÄ±larÄ± (Her satÄ±ra bir URL)</label>
                  <textarea
                    id="disputeEvidenceUrls"
                    rows={3}
                    value={disputeEvidenceUrls}
                    onChange={(event) => setDisputeEvidenceUrls(event.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <button className="button" type="submit" disabled={isSubmittingDispute}>
                  {isSubmittingDispute ? 'Kaydediliyor...' : 'UyuÅŸmazlÄ±k KaydÄ± AÃ§'}
                </button>

                {disputeError ? <p className="page-note">{disputeError}</p> : null}
                {disputeSuccess ? <p className="page-note">{disputeSuccess}</p> : null}
              </form>
            </div>
          ) : null}

          <div className="jobs-header" style={{ marginTop: '20px' }}>
            <PageTitle title="Milestone'lar" description="Proje aÅŸamalarÄ±" />
          </div>

          {canCreateDelivery ? (
            <section className="delivery-hub">
              <div className="panel-metric-grid">
                <article className="metric-tile">
                  <span>Bekleyen Teslim</span>
                  <strong>{freelancerOpenMilestones.length}</strong>
                </article>
                <article className="metric-tile">
                  <span>Revizyon Ä°stenen</span>
                  <strong>{freelancerRevisionMilestones.length}</strong>
                </article>
                <article className="metric-tile">
                  <span>Onaylanan AÅŸama</span>
                  <strong>{freelancerApprovedMilestones.length}</strong>
                </article>
              </div>

              <div className="delivery-hub-grid">
                <article className="delivery-hub-card">
                  <h4>Ã‡alÄ±ÅŸma AÅŸamalarÄ±n</h4>
                  <div className="delivery-hub-list">
                    {freelancerOpenMilestones.map((milestone) => (
                      <button
                        key={milestone.id}
                        type="button"
                        className={`hub-milestone-button ${
                          selectedDeliveryMilestone?.id === milestone.id ? 'active' : ''
                        }`.trim()}
                        onClick={() => setSelectedDeliveryMilestoneId(milestone.id)}
                      >
                        <strong>#{milestone.sequence} {milestone.title}</strong>
                        <span>{getStatusLabel(milestone.status)}</span>
                      </button>
                    ))}
                    {freelancerOpenMilestones.length === 0 ? (
                      <p className="page-note">Teslim bekleyen aÅŸama bulunmuyor.</p>
                    ) : null}
                  </div>
                </article>

                <article className="delivery-hub-card">
                  <h4>Teslim DÃ¼zenleyici</h4>
                  {selectedDeliveryMilestone ? (
                    <>
                      <p className="page-note">
                        SeÃ§ilen AÅŸama: <strong>#{selectedDeliveryMilestone.sequence} {selectedDeliveryMilestone.title}</strong>
                      </p>
                      <p className="page-note">
                        Son Tarih:{' '}
                        {selectedDeliveryMilestone.dueDate
                          ? new Date(selectedDeliveryMilestone.dueDate).toLocaleDateString('tr-TR')
                          : 'Belirtilmedi'}
                      </p>

                      <form
                        className="inline-form"
                        onSubmit={(event) => handleCreateDelivery(event, selectedDeliveryMilestone.id)}
                      >
                        <div className="form-group">
                          <label htmlFor="hub-submission-url">Teslim URL'si</label>
                          <input
                            id="hub-submission-url"
                            value={deliveryDrafts[selectedDeliveryMilestone.id]?.submissionUrl ?? ''}
                            onChange={(event) =>
                              handleDeliveryDraftChange(
                                selectedDeliveryMilestone.id,
                                'submissionUrl',
                                event.target.value,
                              )
                            }
                            placeholder="https://..."
                            required
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="hub-delivery-note">Teslim Notu</label>
                          <textarea
                            id="hub-delivery-note"
                            rows={3}
                            value={deliveryDrafts[selectedDeliveryMilestone.id]?.note ?? ''}
                            onChange={(event) =>
                              handleDeliveryDraftChange(
                                selectedDeliveryMilestone.id,
                                'note',
                                event.target.value,
                              )
                            }
                          />
                        </div>

                        <button
                          className="button"
                          type="submit"
                          disabled={pendingAction === `create-delivery-${selectedDeliveryMilestone.id}`}
                        >
                          {pendingAction === `create-delivery-${selectedDeliveryMilestone.id}`
                            ? 'Teslim kaydediliyor...'
                            : 'Teslimi GÃ¶nder'}
                        </button>
                      </form>

                      {milestoneMessage[selectedDeliveryMilestone.id]?.error ? (
                        <p className="page-note">{milestoneMessage[selectedDeliveryMilestone.id]?.error}</p>
                      ) : null}
                      {milestoneMessage[selectedDeliveryMilestone.id]?.success ? (
                        <p className="page-note">{milestoneMessage[selectedDeliveryMilestone.id]?.success}</p>
                      ) : null}
                    </>
                  ) : (
                    <p className="page-note">Teslim oluÅŸturmak iÃ§in soldan bir aÅŸama seÃ§.</p>
                  )}
                </article>
              </div>
            </section>
          ) : null}

          <div className="milestone-list">
            {milestones.map((milestone) => (
              <article className="milestone-card" key={milestone.id}>
                <div className="project-row">
                  <h3>
                    #{milestone.sequence} {milestone.title}
                  </h3>
                  <span className={statusClass(milestone.status)}>{getStatusLabel(milestone.status)}</span>
                </div>
                <p className="job-description">{milestone.description ?? 'AÃ§Ä±klama yok.'}</p>
                <div className="job-meta">
                  <span className="budget-pill">
                    {formatAmount(milestone.amount, project.currency)}
                  </span>
                  <span>
                    Son Tarih:{' '}
                    {milestone.dueDate
                      ? new Date(milestone.dueDate).toLocaleDateString('tr-TR')
                      : '-'}
                  </span>
                </div>

                <div className="delivery-section">
                  <h4>Teslimler</h4>

                  <div className="delivery-list">
                    {(deliveriesByMilestone[milestone.id] ?? []).map((delivery) => (
                      <DeliveryItem delivery={delivery} key={delivery.id} />
                    ))}
                    {(deliveriesByMilestone[milestone.id] ?? []).length === 0 ? (
                      <p className="page-note">Teslim yok.</p>
                    ) : null}
                  </div>

                  {canCreateDelivery ? (
                    <p className="page-note">
                      Bu aÅŸama iÃ§in teslim yÃ¼klemek veya gÃ¼ncellemek iÃ§in Ã¼stteki <strong>Teslim DÃ¼zenleyici</strong> panelini kullan.
                    </p>
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
                        Onayla
                      </button>

                      <input
                        className="field-inline"
                        placeholder="Revizyon gerekÃ§esi"
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
                        Revizyon Ä°ste
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
                          ? 'Serbest bÄ±rakÄ±lÄ±yor...'
                          : 'Ã–demeyi Serbest BÄ±rak'}
                      </button>
                    </div>
                  ) : null}

                  {canManageDelivery && milestone.payment?.status === 'RELEASED' ? (
                    <div className="delivery-actions">
                      <input
                        className="field-inline"
                        placeholder="Ä°ade gerekÃ§esi"
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
                          ? 'Ä°ade ediliyor...'
                          : 'Ä°ade Et'}
                      </button>
                    </div>
                  ) : null}

                  {milestone.payment ? (
                    <p className="page-note">
                      Ã–deme: #{milestone.payment.id} ({getStatusLabel(milestone.payment.status)})
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
            {milestones.length === 0 ? <p>HenÃ¼z milestone yok.</p> : null}
          </div>

          <div className="page-card centered-form-card" style={{ marginTop: '16px' }}>
            <PageTitle
              title="Proje DeÄŸerlendirmeleri"
              description="Proje tamamlandÄ±ktan sonra taraflar birbirini 1-5 arasÄ± puanlayabilir."
            />

            {reviews.length > 0 ? (
              <div className="timeline-list">
                {reviews.map((review) => (
                  <div key={review.id} className="timeline-row">
                    <strong>
                      {review.reviewer?.fullName ?? `KullanÄ±cÄ± #${review.reviewerId}`} â†’{' '}
                      {review.reviewee?.fullName ?? `KullanÄ±cÄ± #${review.revieweeId}`}
                    </strong>
                    <span>Puan: {review.rating}/5</span>
                    <span>{review.comment ?? 'Yorum eklenmedi.'}</span>
                    <span>{new Date(review.createdAt).toLocaleString('tr-TR')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="page-note">Bu proje iÃ§in henÃ¼z deÄŸerlendirme bulunmuyor.</p>
            )}

            {canCreateReview ? (
              <form className="inline-form" onSubmit={handleCreateReview}>
                <div className="form-group">
                  <label htmlFor="reviewRating">Puan</label>
                  <select
                    id="reviewRating"
                    value={reviewRating}
                    onChange={(event) => setReviewRating(event.target.value)}
                  >
                    <option value="5">5 - MÃ¼kemmel</option>
                    <option value="4">4 - Ä°yi</option>
                    <option value="3">3 - Orta</option>
                    <option value="2">2 - GeliÅŸtirilmeli</option>
                    <option value="1">1 - ZayÄ±f</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="reviewComment">Yorum</label>
                  <textarea
                    id="reviewComment"
                    rows={3}
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="Ã‡alÄ±ÅŸma sÃ¼reciyle ilgili kÄ±sa geri bildirim."
                  />
                </div>

                <button
                  className="button"
                  type="submit"
                  disabled={isSubmittingReview || !canSubmitReview}
                >
                  {isSubmittingReview ? 'Kaydediliyor...' : 'DeÄŸerlendirme GÃ¶nder'}
                </button>

                {project.status.toUpperCase() !== 'COMPLETED' ? (
                  <p className="page-note">DeÄŸerlendirme yalnÄ±zca proje tamamlandÄ±ktan sonra aÃ§Ä±lÄ±r.</p>
                ) : null}
                {hasSubmittedReview ? (
                  <p className="page-note">Bu proje için karşı tarafa zaten değerlendirme yaptın.</p>
                ) : null}
                {reviewError ? <p className="page-note">{reviewError}</p> : null}
                {reviewSuccess ? <p className="page-note">{reviewSuccess}</p> : null}
              </form>
            ) : null}
          </div>

          {canCreateMilestone ? (
            <div className="page-card centered-form-card" style={{ marginTop: '16px' }}>
              <PageTitle title="Milestone Ekle" description="YalnÄ±zca mÃ¼ÅŸteri rolÃ¼ oluÅŸturabilir." />

              <form onSubmit={handleCreateMilestone}>
                <div className="form-group">
                  <label htmlFor="milestoneTitle">BaÅŸlÄ±k</label>
                  <input
                    id="milestoneTitle"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    maxLength={180}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="milestoneDescription">AÃ§Ä±klama</label>
                  <textarea
                    id="milestoneDescription"
                    rows={4}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="milestoneAmount">Tutar</label>
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
                  {isSubmitting ? 'OluÅŸturuluyor...' : 'Milestone OluÅŸtur'}
                </button>

                {submitError ? <p className="page-note">{submitError}</p> : null}
                {submitSuccess ? <p className="page-note">{submitSuccess}</p> : null}
              </form>
            </div>
          ) : (
            <p className="page-note">Freelancer milestone oluÅŸturamaz, yalnÄ±zca gÃ¶rÃ¼ntÃ¼ler.</p>
          )}
        </>
      ) : null}

      <p className="page-note">
        <Link to="/projects">Projelere dÃ¶n</Link>
      </p>
    </section>
  )
}

