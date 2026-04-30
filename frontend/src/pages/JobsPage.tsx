import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import { PageTitle } from '../components/PageTitle'
import { useAuth } from '../context/AuthContext'
import { jobsService } from '../api/jobs.service'
import type { Job, ListJobsFilters } from '../types/job'
import type { ApiEnvelope } from '../types/auth'

type Bid = {
  id: number
  status: string
}

type JobBidSummary = {
  total: number
  active: number
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

function getStatusClass(status?: string): string {
  const value = (status ?? '').toUpperCase()
  if (value === 'OPEN' || value === 'ACTIVE') {
    return 'status-badge status-success'
  }

  if (value === 'CLOSED' || value === 'CANCELLED' || value === 'CANCELED') {
    return 'status-badge status-danger'
  }

  return 'status-badge status-pending'
}

function getStatusLabel(status?: string): string {
  const value = (status ?? '').toUpperCase()

  if (value === 'OPEN') {
    return 'Açık'
  }

  if (value === 'ACTIVE') {
    return 'Aktif'
  }

  if (value === 'CLOSED') {
    return 'Kapalı'
  }

  if (value === 'CANCELED' || value === 'CANCELLED') {
    return 'İptal Edildi'
  }

  return 'Bilinmiyor'
}

export function JobsPage() {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const isCustomer = roles.includes('CUSTOMER')
  const userId = user?.id !== undefined ? Number(user.id) : null
  const canMatchOwnership = Number.isFinite(userId)

  const [jobs, setJobs] = useState<Job[]>([])
  const [jobBidSummary, setJobBidSummary] = useState<Record<number, JobBidSummary>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    q: '',
    category: '',
    skill: '',
    budgetMin: '',
    budgetMax: '',
    deadlineDaysMax: '',
  })

  const loadJobs = useCallback(async (nextFilters?: ListJobsFilters) => {
    if (!isCustomer) {
      setJobBidSummary({})
      setIsSummaryLoading(false)
    }

    try {
      setError(null)
      const effectiveFilters: ListJobsFilters = isCustomer
        ? { ...(nextFilters ?? {}) }
        : { ...(nextFilters ?? {}), status: 'OPEN' }

      const data = await jobsService.list(effectiveFilters)
      setJobs(data)

      if (isCustomer) {
        const customerJobs =
          canMatchOwnership && userId !== null
            ? data.filter((job) => job.customer?.id === userId)
            : data

        if (customerJobs.length === 0) {
          setJobBidSummary({})
          return
        }

        setIsSummaryLoading(true)
        const entries = await Promise.all(
          customerJobs.map(async (job) => {
            try {
              const { data } = await api.get<ApiEnvelope<Bid[]> | Bid[]>(`/jobs/${job.id}/bids`)
              const list = unwrapResponse<Bid[]>(data)
              return [
                job.id,
                {
                  total: list.length,
                  active: list.filter((bid) => bid.status.toUpperCase() === 'ACTIVE').length,
                },
              ] as const
            } catch {
              return [job.id, { total: 0, active: 0 }] as const
            }
          }),
        )

        setJobBidSummary(Object.fromEntries(entries))
      }
    } catch {
      setError('İş listesi alınamadı.')
    } finally {
      setIsSummaryLoading(false)
      setIsLoading(false)
    }
  }, [canMatchOwnership, isCustomer, userId])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadJobs()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [loadJobs])

  const myJobs = useMemo(() => {
    if (!isCustomer) {
      return [] as Job[]
    }

    if (!canMatchOwnership) {
      return jobs
    }

    return jobs.filter((job) => job.customer?.id === userId)
  }, [canMatchOwnership, isCustomer, jobs, userId])

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleApplyFilters = async () => {
    setIsLoading(true)
    const normalized: ListJobsFilters = {
      q: filters.q?.trim() || undefined,
      category: filters.category?.trim() || undefined,
      skill: filters.skill?.trim() || undefined,
      budgetMin: filters.budgetMin.trim() ? Number(filters.budgetMin) : undefined,
      budgetMax: filters.budgetMax.trim() ? Number(filters.budgetMax) : undefined,
      deadlineDaysMax: filters.deadlineDaysMax.trim()
        ? Number(filters.deadlineDaysMax)
        : undefined,
    }
    await loadJobs(normalized)
  }

  const handleClearFilters = async () => {
    setFilters({
      q: '',
      category: '',
      skill: '',
      budgetMin: '',
      budgetMax: '',
      deadlineDaysMax: '',
    })
    setIsLoading(true)
    await loadJobs()
  }

  const totalBidCount = Object.values(jobBidSummary).reduce((sum, item) => sum + item.total, 0)
  const openJobCount = myJobs.filter((job) => (job.status ?? '').toUpperCase() === 'OPEN').length

  return (
    <section className="page-card">
      <div className="jobs-header">
        <PageTitle
          title={isCustomer ? 'İlan Yönetim Paneli' : 'İş İlanları'}
          description={
            isCustomer
              ? 'İlanlarını, gelen teklifleri ve proje başlatma adımlarını tek noktadan yönet.'
              : 'Tüm açık ilanları incele, filtrele ve detaylara ulaş.'
          }
        />
        <Link className="button" to="/jobs/create">
          Yeni İlan
        </Link>
      </div>

      {isCustomer ? (
        <div className="panel-metric-grid">
          <article className="metric-tile">
            <span>Yayındaki İlanlarım</span>
            <strong>{isLoading ? '...' : myJobs.length}</strong>
          </article>
          <article className="metric-tile">
            <span>Toplam Teklif Akışı</span>
            <strong>{isSummaryLoading ? '...' : totalBidCount}</strong>
          </article>
          <article className="metric-tile">
            <span>Açık İlan Sayısı</span>
            <strong>{isLoading ? '...' : openJobCount}</strong>
          </article>
        </div>
      ) : null}

      <div className="project-grid filter-grid">
        <div className="form-group">
          <label htmlFor="q">Anahtar Kelime</label>
          <input
            id="q"
            value={filters.q ?? ''}
            onChange={(event) => handleFilterChange('q', event.target.value)}
            placeholder="Başlık veya açıklama"
          />
        </div>
        <div className="form-group">
          <label htmlFor="category">Kategori</label>
          <input
            id="category"
            value={filters.category ?? ''}
            onChange={(event) => handleFilterChange('category', event.target.value)}
            placeholder="UI/UX, Backend..."
          />
        </div>
        <div className="form-group">
          <label htmlFor="skill">Yetenek</label>
          <input
            id="skill"
            value={filters.skill ?? ''}
            onChange={(event) => handleFilterChange('skill', event.target.value)}
            placeholder="React, NestJS..."
          />
        </div>
        <div className="form-group">
          <label htmlFor="budgetMin">Bütçe Min</label>
          <input
            id="budgetMin"
            type="number"
            min={0}
            value={filters.budgetMin ?? ''}
            onChange={(event) => handleFilterChange('budgetMin', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="budgetMax">Bütçe Max</label>
          <input
            id="budgetMax"
            type="number"
            min={0}
            value={filters.budgetMax ?? ''}
            onChange={(event) => handleFilterChange('budgetMax', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="deadlineDaysMax">Teslim Süresi (Gün)</label>
          <input
            id="deadlineDaysMax"
            type="number"
            min={1}
            value={filters.deadlineDaysMax ?? ''}
            onChange={(event) => handleFilterChange('deadlineDaysMax', event.target.value)}
          />
        </div>
      </div>

      <div className="delivery-actions panel-actions">
        <button className="button button-subtle" type="button" onClick={() => void handleApplyFilters()}>
          Filtrele
        </button>
        <button className="button button-subtle" type="button" onClick={() => void handleClearFilters()}>
          Temizle
        </button>
      </div>

      {isLoading ? <p>Yükleniyor...</p> : null}
      {error ? <p>{error}</p> : null}

      {!isLoading && !error ? (
        <>
          {isCustomer ? (
            <section className="jobs-manage-section">
              <div className="jobs-header">
                <PageTitle
                  title="İlanlarım"
                  description="Teklif yoğunluğuna göre ilanı aç, incele ve freelancer seç."
                />
              </div>
              <div className="jobs-list">
                {myJobs.map((job) => (
                  <article key={job.id} className="job-card">
                    <div className="job-meta">
                      <span className="budget-pill">{formatBudget(job)}</span>
                      <span className={getStatusClass(job.status)}>{getStatusLabel(job.status)}</span>
                    </div>
                    <h3>
                      <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                    </h3>
                    <p className="job-description">{job.description}</p>
                    <div className="manage-row">
                      <span className="table-chip">
                        Teklif: {isSummaryLoading ? '...' : jobBidSummary[job.id]?.total ?? 0}
                      </span>
                      <Link className="button button-subtle" to={`/jobs/${job.id}`}>
                        Teklifleri Yönet
                      </Link>
                    </div>
                  </article>
                ))}
                {myJobs.length === 0 ? (
                  <p className="page-note">Bu filtrede sana ait ilan bulunmuyor.</p>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="jobs-market-section">
            <div className="jobs-header">
              <PageTitle
                title={isCustomer ? 'Pazar Görünümü' : 'Tüm İlanlar'}
                description="Filtrelenmiş genel ilan listesi."
              />
            </div>
            <div className="jobs-list">
              {jobs.map((job) => (
                <article key={job.id} className="job-card">
                  <h3>
                    <Link to={`/jobs/${job.id}`}>{job.title}</Link>
                  </h3>
                  <p className="job-description">{job.description}</p>
                  <div className="job-meta">
                    <span className="budget-pill">{formatBudget(job)}</span>
                    <Link to={`/jobs/${job.id}`}>Detay</Link>
                  </div>
                </article>
              ))}

              {jobs.length === 0 ? <p>Henüz iş ilanı yok.</p> : null}
            </div>
          </section>
        </>
      ) : null}
    </section>
  )
}
