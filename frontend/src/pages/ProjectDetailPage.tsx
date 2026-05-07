import { useCallback, useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import type { FormEvent } from 'react' 

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
    return 'Onaylandı'
  }

  if (value === 'COMPLETED') {
    return 'Tamamlandı'
  }

  if (value === 'REVISION_REQUESTED') {
    return 'Revizyon İstendi'
  }

  if (value === 'REJECTED') {
    return 'Reddedildi'
  }

  if (value === 'CANCELED' || value === 'CANCELLED') {
    return 'İptal Edildi'
  }

  if (value === 'RELEASED') {
    return 'Serbest Bırakıldı'
  }

  if (value === 'REFUNDED') {
    return 'İade Edildi'
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
        <strong>Sürüm {delivery.version}</strong>
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
  const [dueDate, setDueDate] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompletingProject, setIsCompletingProject] = useState(false)
  const [projectActionMessage, setProjectActionMessage] = useState<string | null>(null)

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
  const canCompleteProject =
    Boolean(token) && roles.includes('CUSTOMER') && project?.status.toUpperCase() === 'ACTIVE'

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
      setSubmitError('Geçersiz proje kimliği.')
      return
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setSubmitError('Tutar geçerli bir sayı olmalı.')
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
          dueDate: dueDate || undefined,
        },
        sequence,
      )

      setTitle('')
      setDescription('')
      setAmount('')
      setDueDate('')
      setSubmitSuccess('Milestone başarıyla oluşturuldu.')

      const updatedMilestones = await refreshMilestones()
      if (canViewDeliveries) {
        await Promise.all(updatedMilestones.map((milestone) => loadDeliveriesForMilestone(milestone.id)))
      }
    } catch (err) {
      setSubmitError(getApiMessage(err, 'Milestone oluşturulamadı.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCompleteProject = async () => {
    if (!project) {
      return
    }

    setIsCompletingProject(true)
    setProjectActionMessage(null)
    try {
      await projectsService.updateStatus(project.id, { status: 'COMPLETED' })
      await loadProjectData(projectIdNumber)
      setProjectActionMessage('Proje tamamlandı olarak güncellendi.')
    } catch (err) {
      setProjectActionMessage(getApiMessage(err, 'Proje tamamlanamadı.'))
    } finally {
      setIsCompletingProject(false)
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
      // Teslim bağlantısının geçerli bir URL olması gerekir.
      new URL(draft.submissionUrl.trim())
    } catch {
      setMilestoneError(milestoneId, "Geçerli bir URL gir (ör. https://...).")
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
      setMilestoneSuccess(milestoneId, 'Teslim yüklendi.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Teslim yüklenemedi.'))
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
      setMilestoneSuccess(milestoneId, 'Teslim onaylandı.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Teslim onaylanamadı.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleRequestRevision = async (milestoneId: number, deliveryId: number) => {
    const reason = revisionReasonByMilestone[milestoneId]?.trim() || 'Lütfen revize et.'

    setPendingAction(`revision-delivery-${deliveryId}`)
    setMilestoneMessage((prev) => ({ ...prev, [milestoneId]: {} }))

    try {
      await api.patch(`/deliveries/${deliveryId}/revision`, { reason })
      await refreshMilestones()
      await loadDeliveriesForMilestone(milestoneId)
      setMilestoneSuccess(milestoneId, 'Revizyon talebi gönderildi.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Revizyon talebi gönderilemedi.'))
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
      setMilestoneSuccess(milestoneId, 'Ödeme serbest bırakıldı.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'Ödeme serbest bırakılamadı.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleRefundPayment = async (milestoneId: number, paymentId: number) => {
    const reason = refundReasonByMilestone[milestoneId]?.trim()
    if (!reason) {
      setMilestoneError(milestoneId, 'İade için gerekçe yazılmalı.')
      return
    }

    setPendingAction(`refund-payment-${paymentId}`)
    setMilestoneMessage((prev) => ({ ...prev, [milestoneId]: {} }))

    try {
      await api.patch(`/payments/${paymentId}/refund`, { reason })
      await refreshMilestones()
      setMilestoneSuccess(milestoneId, 'Ödeme iadesi tamamlandı.')
    } catch (err) {
      setMilestoneError(milestoneId, getApiMessage(err, 'İade işlemi başarısız.'))
    } finally {
      setPendingAction(null)
    }
  }

  const handleCreateDispute = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const reason = disputeReason.trim()
    if (!reason) {
      setDisputeError('Uyuşmazlık gerekçesi boş olamaz.')
      return
    }

    let milestoneId: number | undefined
    if (disputeMilestoneId.trim()) {
      const parsedMilestoneId = Number(disputeMilestoneId)
      if (!Number.isInteger(parsedMilestoneId) || parsedMilestoneId < 1) {
        setDisputeError('Milestone seçimi geçersiz.')
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
        setDisputeError(`Geçersiz kanıt bağlantısı: ${url}`)
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
      setDisputeSuccess('Uyuşmazlık kaydı oluşturuldu.')
      await loadProjectData(projectIdNumber)
    } catch (err) {
      setDisputeError(getApiMessage(err, 'Uyuşmazlık kaydı oluşturulamadı.'))
    } finally {
      setIsSubmittingDispute(false)
    }
  }

  const handleCreateReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const parsedRating = Number(reviewRating)
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      setReviewError('Puan 1 ile 5 arasında olmalıdır.')
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
      setReviewSuccess('Değerlendirmen kaydedildi.')
      await loadReviews()
    } catch (err) {
      setReviewError(getApiMessage(err, 'Değerlendirme kaydedilemedi.'))
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
  const allMilestonesApproved =
    milestones.length > 0 &&
    milestones.every((milestone) => {
      const status = milestone.status.toUpperCase()
      return status === 'APPROVED' || status === 'COMPLETED'
    })

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
        setError('Proje detayı alınamadı.')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [canViewDeliveries, isValidProjectId, loadProjectData, loadReviews, projectIdNumber])

  if (!isValidProjectId) {
    return (
      <section className="page-card">
        <PageTitle title="Proje Detayı" description="Proje özeti ve milestone yönetimi" />
        <p className="page-note">Geçersiz proje kimliği.</p>
        <p className="page-note">
          <Link to="/projects">Projelere dön</Link>
        </p>
      </section>
    )
  }

  return (
    <section className="page-card">
      <PageTitle title="Proje Detayı" description="Proje özeti ve milestone yönetimi" />

      {isLoading ? <p>Yükleniyor...</p> : null}
      {error ? <p className="page-note">{error}</p> : null}

      {!isLoading && !error && project ? (
        <>
          <article className="project-card">
            <h3>{project.jobListing?.title ?? project.title}</h3>
            <p className="job-description">{project.summary ?? 'Özet yok.'}</p>

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
                <span>Müşteri</span>
                <strong>{project.customer?.fullName ?? '-'}</strong>
              </div>
              <div className="project-row">
                <span>Toplam Tutar</span>
                <strong className="budget-pill">
                  {formatAmount(project.totalAmount, project.currency)}
                </strong>
              </div>
            </div>
            {canCompleteProject ? (
              <div className="delivery-actions" style={{ marginTop: '12px' }}>
                <button
                  className="button"
                  type="button"
                  disabled={isCompletingProject || !allMilestonesApproved}
                  onClick={() => void handleCompleteProject()}
                >
                  {isCompletingProject ? 'Tamamlanıyor...' : 'Projeyi Tamamla'}
                </button>
                {!allMilestonesApproved ? (
                  <p className="page-note">
                    Projeyi tamamlamak için tüm milestone&apos;lar onaylanmış olmalı.
                  </p>
                ) : null}
                {projectActionMessage ? <p className="page-note">{projectActionMessage}</p> : null}
              </div>
            ) : null}
          </article>

          {canCreateDispute ? (
            <div className="page-card centered-form-card" style={{ marginTop: '14px' }}>
              <PageTitle
                title="Uyuşmazlık Kaydı Oluştur"
                description="Gerekçeyi ve varsa kanıt bağlantılarını ekleyerek inceleme sürecini başlat."
              />

              <form onSubmit={handleCreateDispute}>
                <div className="form-group">
                  <label htmlFor="disputeReason">Uyuşmazlık Gerekçesi</label>
                  <textarea
                    id="disputeReason"
                    rows={4}
                    value={disputeReason}
                    onChange={(event) => setDisputeReason(event.target.value)}
                    placeholder="Karşılaştığın sorunu açık ve net bir şekilde yaz."
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="disputeMilestoneId">İlgili Milestone (Opsiyonel)</label>
                  <select
                    id="disputeMilestoneId"
                    value={disputeMilestoneId}
                    onChange={(event) => setDisputeMilestoneId(event.target.value)}
                  >
                    <option value="">Proje Genelinde Uyuşmazlık</option>
                    {milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        #{milestone.sequence} {milestone.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="disputeEvidenceUrls">Kanıt Bağlantıları (Her satıra bir URL)</label>
                  <textarea
                    id="disputeEvidenceUrls"
                    rows={3}
                    value={disputeEvidenceUrls}
                    onChange={(event) => setDisputeEvidenceUrls(event.target.value)}
                    placeholder="https://..."
                  />
                </div>

                <button className="button" type="submit" disabled={isSubmittingDispute}>
                  {isSubmittingDispute ? 'Kaydediliyor...' : 'Uyuşmazlık Kaydı Aç'}
                </button>

                {disputeError ? <p className="page-note">{disputeError}</p> : null}
                {disputeSuccess ? <p className="page-note">{disputeSuccess}</p> : null}
              </form>
            </div>
          ) : null}

          <div className="jobs-header" style={{ marginTop: '20px' }}>
            <PageTitle title="Milestone'lar" description="Proje aşamaları" />
          </div>

          {canCreateDelivery ? (
            <section className="delivery-hub">
              <div className="panel-metric-grid">
                <article className="metric-tile">
                  <span>Bekleyen Teslim</span>
                  <strong>{freelancerOpenMilestones.length}</strong>
                </article>
                <article className="metric-tile">
                  <span>Revizyon İstenen</span>
                  <strong>{freelancerRevisionMilestones.length}</strong>
                </article>
                <article className="metric-tile">
                  <span>Onaylanan Aşama</span>
                  <strong>{freelancerApprovedMilestones.length}</strong>
                </article>
              </div>

              <div className="delivery-hub-grid">
                <article className="delivery-hub-card">
                  <h4>Çalışma Aşamaların</h4>
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
                      <p className="page-note">Teslim bekleyen aşama bulunmuyor.</p>
                    ) : null}
                  </div>
                </article>

                <article className="delivery-hub-card">
                  <h4>Teslim Düzenleyici</h4>
                  {selectedDeliveryMilestone ? (
                    <>
                      <p className="page-note">
                        Seçilen Aşama: <strong>#{selectedDeliveryMilestone.sequence} {selectedDeliveryMilestone.title}</strong>
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
                            : 'Teslimi Gönder'}
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
                    <p className="page-note">Teslim oluşturmak için soldan bir aşama seç.</p>
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
                <p className="job-description">{milestone.description ?? 'Açıklama yok.'}</p>
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
                      Bu aşama için teslim yüklemek veya güncellemek için üstteki <strong>Teslim Düzenleyici</strong> panelini kullan.
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
                        placeholder="Revizyon gerekçesi"
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
                        Revizyon İste
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
                          ? 'Serbest bırakılıyor...'
                          : 'Ödemeyi Serbest Bırak'}
                      </button>
                    </div>
                  ) : null}

                  {canManageDelivery && milestone.payment?.status === 'RELEASED' ? (
                    <div className="delivery-actions">
                      <input
                        className="field-inline"
                        placeholder="İade gerekçesi"
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
                          ? 'İade ediliyor...'
                          : 'İade Et'}
                      </button>
                    </div>
                  ) : null}

                  {milestone.payment ? (
                    <p className="page-note">
                      Ödeme: #{milestone.payment.id} ({getStatusLabel(milestone.payment.status)})
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
            {milestones.length === 0 ? <p>Henüz milestone yok.</p> : null}
          </div>

          <div className="page-card centered-form-card" style={{ marginTop: '16px' }}>
            <PageTitle
              title="Proje Değerlendirmeleri"
              description="Proje tamamlandıktan sonra taraflar birbirini 1-5 arası puanlayabilir."
            />

            {reviews.length > 0 ? (
              <div className="timeline-list">
                {reviews.map((review) => (
                  <div key={review.id} className="timeline-row">
                    <strong>
                      {review.reviewer?.fullName ?? `Kullanıcı #${review.reviewerId}`} â†’{' '}
                      {review.reviewee?.fullName ?? `Kullanıcı #${review.revieweeId}`}
                    </strong>
                    <span>Puan: {review.rating}/5</span>
                    <span>{review.comment ?? 'Yorum eklenmedi.'}</span>
                    <span>{new Date(review.createdAt).toLocaleString('tr-TR')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="page-note">Bu proje için henüz değerlendirme bulunmuyor.</p>
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
                    <option value="5">5 - Mükemmel</option>
                    <option value="4">4 - İyi</option>
                    <option value="3">3 - Orta</option>
                    <option value="2">2 - Geliştirilmeli</option>
                    <option value="1">1 - Zayıf</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="reviewComment">Yorum</label>
                  <textarea
                    id="reviewComment"
                    rows={3}
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="Çalışma süreciyle ilgili kısa geri bildirim."
                  />
                </div>

                <button
                  className="button"
                  type="submit"
                  disabled={isSubmittingReview || !canSubmitReview}
                >
                  {isSubmittingReview ? 'Kaydediliyor...' : 'Değerlendirme Gönder'}
                </button>

                {project.status.toUpperCase() !== 'COMPLETED' ? (
                  <p className="page-note">Değerlendirme yalnızca proje tamamlandıktan sonra açılır.</p>
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
              <PageTitle title="Milestone Ekle" description="Yalnızca müşteri rolü oluşturabilir." />

              <form onSubmit={handleCreateMilestone}>
                <div className="form-group">
                  <label htmlFor="milestoneTitle">Başlık</label>
                  <input
                    id="milestoneTitle"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    maxLength={180}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="milestoneDescription">Açıklama</label>
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

                <div className="form-group">
                  <label htmlFor="milestoneDueDate">Son Tarih</label>
                  <input
                    id="milestoneDueDate"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </div>

                <button className="button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Oluşturuluyor...' : 'Milestone Oluştur'}
                </button>

                {submitError ? <p className="page-note">{submitError}</p> : null}
                {submitSuccess ? <p className="page-note">{submitSuccess}</p> : null}
              </form>
            </div>
          ) : (
            <p className="page-note">Freelancer milestone oluşturamaz, yalnızca görüntüler.</p>
          )}
        </>
      ) : null}

      <p className="page-note">
        <Link to="/projects">Projelere dön</Link>
      </p>
    </section>
  )
}

