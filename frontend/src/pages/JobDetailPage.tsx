import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { isAxiosError } from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios'
import { PageTitle } from '../components/PageTitle'
import { useAuth } from '../context/AuthContext'
import { jobsService } from '../api/jobs.service'
import { projectsService } from '../api/projects.service'
import type { ApiEnvelope } from '../types/auth'
import type { Job } from '../types/job'

type Bid = {
  id: number
  freelancerId: number
  proposedAmount: number
  coverLetter: string | null
  status: string
  createdAt: string
  freelancer?: {
    id: number
    email: string
    fullName?: string
  }
}

function formatBudget(job: Job): string {
  const currency = job.currency ?? 'TRY'
  const min = job.budgetMin
  const max = job.budgetMax

  if (min === null && max === null) {
    return '-'
  }

  if (min !== null && max !== null && min !== max) {
    return `${currency} ${min} - ${max}`
  }

  return `${currency} ${min ?? max}`
}

function unwrapResponse<T>(payload: T | ApiEnvelope<T>): T {
  if (payload !== null && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
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

function formatDate(value: string): string {
  return new Date(value).toLocaleString('tr-TR')
}

function getStatusLabel(status?: string): string {
  const value = (status ?? '').toUpperCase()

  if (value === 'OPEN') {
    return 'Açık'
  }

  if (value === 'ACTIVE') {
    return 'Aktif'
  }

  if (value === 'ACCEPTED') {
    return 'Kabul Edildi'
  }

  if (value === 'REJECTED') {
    return 'Reddedildi'
  }

  if (value === 'WITHDRAWN') {
    return 'Geri Çekildi'
  }

  return status ?? 'Bilinmiyor'
}

export function JobDetailPage() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const { user, token } = useAuth()

  const [job, setJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [bids, setBids] = useState<Bid[]>([])
  const [isBidsLoading, setIsBidsLoading] = useState(false)
  const [bidsError, setBidsError] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [bidError, setBidError] = useState<string | null>(null)
  const [bidSuccess, setBidSuccess] = useState<string | null>(null)
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const [acceptingBidId, setAcceptingBidId] = useState<number | null>(null)

  const roles = user?.roles ?? []
  const canCreateBid = Boolean(token) && roles.includes('FREELANCER')
  const canViewBids = Boolean(token) && roles.includes('CUSTOMER')
  const canAcceptBid = Boolean(token) && roles.includes('CUSTOMER')

  const jobCurrency = job?.currency ?? 'TRY'
  const sortedBids = useMemo(
    () => [...bids].sort((left, right) => left.proposedAmount - right.proposedAmount),
    [bids],
  )
  const activeBidCount = sortedBids.filter((bid) => bid.status.toUpperCase() === 'ACTIVE').length
  const bestBid = sortedBids[0] ?? null

  const loadBids = useCallback(
    async (jobId: number) => {
      if (!canViewBids) {
        setBids([])
        setBidsError(null)
        setIsBidsLoading(false)
        return
      }

      setIsBidsLoading(true)

      try {
        setBidsError(null)
        const { data } = await api.get<ApiEnvelope<Bid[]> | Bid[]>(`/jobs/${jobId}/bids`)
        setBids(unwrapResponse<Bid[]>(data))
      } catch (err) {
        setBidsError(getApiMessage(err, 'Teklifler alınamadı.'))
      } finally {
        setIsBidsLoading(false)
      }
    },
    [canViewBids],
  )

  const handleCreateBid = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const jobId = Number(params.id)
    const parsedAmount = Number(amount)

    if (!Number.isInteger(jobId)) {
      setBidError('Geçersiz ilan kimliği.')
      return
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setBidError('Teklif tutarı geçerli bir sayı olmalı.')
      return
    }

    setIsSubmittingBid(true)
    setBidError(null)
    setBidSuccess(null)

    try {
      await api.post(`/jobs/${jobId}/bids`, {
        proposedAmount: parsedAmount,
        coverLetter: message.trim() || undefined,
      })

      setAmount('')
      setMessage('')
      setBidSuccess('Teklif başarıyla gönderildi.')
      await loadBids(jobId)
    } catch (err) {
      setBidError(getApiMessage(err, 'Teklif gönderilemedi.'))
    } finally {
      setIsSubmittingBid(false)
    }
  }

  const handleAcceptBid = async (bidId: number) => {
    setAcceptingBidId(bidId)
    setBidsError(null)

    try {
      await api.patch(`/bids/${bidId}/accept`)

      // Proje zaten oluşmuşsa conflict dönebilir; bu durumda direkt projects'e gitmek yeterli.
      try {
        await projectsService.createFromAcceptedBid(bidId)
      } catch (err) {
        const message = getApiMessage(err, 'Project already exists')
        if (!message.toLowerCase().includes('already exists')) {
          throw err
        }
      }

      navigate('/projects')
    } catch (err) {
      setBidsError(getApiMessage(err, 'Teklif kabul edilemedi.'))
    } finally {
      setAcceptingBidId(null)
    }
  }

  useEffect(() => {
    const loadDetail = async () => {
      const id = Number(params.id)

      if (!Number.isInteger(id)) {
        setError('Geçersiz ilan kimliği.')
        setIsLoading(false)
        return
      }

      try {
        setError(null)
        const detail = await jobsService.getById(id)
        setJob(detail)
        await loadBids(id)
      } catch {
        setError('İlan detayı alınamadı.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadDetail()
  }, [params.id, loadBids])

  return (
    <section className="page-card">
      <PageTitle title="İlan Detayı" description="İlanın detay bilgileri" />

      {isLoading ? <p>Yükleniyor...</p> : null}
      {error ? <p>{error}</p> : null}

      {!isLoading && !error && job ? (
        <article className="job-card">
          <h3>{job.title}</h3>
          <p className="job-description">{job.description}</p>
          <div className="job-meta">
            <span className="budget-pill">{formatBudget(job)}</span>
            <span>Durum: {getStatusLabel(job.status)}</span>
          </div>
        </article>
      ) : null}

      {!isLoading && !error ? (
        <>
          <div className="jobs-header" style={{ marginTop: '22px' }}>
            <PageTitle title="Teklifler" description="Bu ilan için gelen teklifler" />
          </div>

          {canViewBids ? (
            <>
              <div className="panel-metric-grid">
                <article className="metric-tile">
                  <span>Toplam Teklif</span>
                  <strong>{isBidsLoading ? '...' : sortedBids.length}</strong>
                </article>
                <article className="metric-tile">
                  <span>Aktif Teklif</span>
                  <strong>{isBidsLoading ? '...' : activeBidCount}</strong>
                </article>
                <article className="metric-tile">
                  <span>En Uygun Teklif</span>
                  <strong>
                    {isBidsLoading || !bestBid ? '-' : `${jobCurrency} ${bestBid.proposedAmount}`}
                  </strong>
                </article>
              </div>

              {isBidsLoading ? <p>Teklifler yükleniyor...</p> : null}
              {bidsError ? <p className="page-note">{bidsError}</p> : null}

              {!isBidsLoading && !bidsError ? (
                <div className="jobs-list">
                  {sortedBids.map((bid) => (
                    <article className="job-card" key={bid.id}>
                      <div className="job-meta">
                        <span className="budget-pill">
                          {jobCurrency} {bid.proposedAmount}
                        </span>
                        <span className="status-badge status-pending">{getStatusLabel(bid.status)}</span>
                      </div>
                      <h3>{bid.freelancer?.fullName ?? bid.freelancer?.email ?? `Kullanıcı #${bid.freelancerId}`}</h3>
                      <p className="page-note">Teklif Tarihi: {formatDate(bid.createdAt)}</p>
                      <p className="job-description">{bid.coverLetter ?? 'Mesaj yok.'}</p>
                      <div className="manage-row">
                        {canAcceptBid && bid.status === 'ACTIVE' ? (
                          <button
                            className="button button-subtle"
                            type="button"
                            disabled={acceptingBidId === bid.id}
                            onClick={() => handleAcceptBid(bid.id)}
                          >
                            {acceptingBidId === bid.id ? 'Onaylanıyor...' : 'Teklifi Onayla'}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}

                  {bids.length === 0 ? <p>Bu ilana henüz teklif yok.</p> : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className="page-note">Bu ilanın tekliflerini yalnızca müşteri rolü görebilir.</p>
          )}

          {canCreateBid ? (
            <div className="page-card centered-form-card" style={{ marginTop: '16px' }}>
              <PageTitle title="Teklif Ver" description="Tutar ve mesaj bilgisi ile teklif gönder." />

              <form onSubmit={handleCreateBid}>
                <div className="form-group">
                  <label htmlFor="bidAmount">Tutar</label>
                  <input
                    id="bidAmount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="bidMessage">Mesaj</label>
                  <textarea
                    id="bidMessage"
                    rows={4}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </div>

                <button className="button" type="submit" disabled={isSubmittingBid}>
                  {isSubmittingBid ? 'Gönderiliyor...' : 'Teklif Gönder'}
                </button>

                {bidError ? <p className="page-note">{bidError}</p> : null}
                {bidSuccess ? <p className="page-note">{bidSuccess}</p> : null}
              </form>
            </div>
          ) : (
            <p className="page-note">Bu ilana yalnızca freelancer rolü teklif verebilir.</p>
          )}
        </>
      ) : null}

      <p className="page-note">
        <Link to="/jobs">İlanlara dön</Link>
      </p>
    </section>
  )
}
