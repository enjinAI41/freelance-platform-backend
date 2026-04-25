import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageTitle } from '../components/PageTitle'
import { jobsService } from '../api/jobs.service'
import type { Job, ListJobsFilters } from '../types/job'

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

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    q: '',
    category: '',
    skill: '',
    budgetMin: '',
    budgetMax: '',
    deadlineDaysMax: '',
  })

  const loadJobs = async (nextFilters?: ListJobsFilters) => {
    try {
      setError(null)
      const data = await jobsService.list(nextFilters)
      setJobs(data)
    } catch {
      setError('Jobs listesi alinamadi.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadJobs()
  }, [])

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

  return (
    <section className="page-card">
      <div className="jobs-header">
        <PageTitle title="Jobs" description="Tum is ilanlari" />
        <Link className="button" to="/jobs/create">
          New Job
        </Link>
      </div>

      <div className="project-grid" style={{ marginBottom: '16px' }}>
        <div className="form-group">
          <label htmlFor="q">Anahtar Kelime</label>
          <input
            id="q"
            value={filters.q ?? ''}
            onChange={(event) => handleFilterChange('q', event.target.value)}
            placeholder="Baslik veya aciklama"
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
            placeholder="react, nestjs..."
          />
        </div>
        <div className="form-group">
          <label htmlFor="budgetMin">Butce Min</label>
          <input
            id="budgetMin"
            type="number"
            min={0}
            value={filters.budgetMin ?? ''}
            onChange={(event) => handleFilterChange('budgetMin', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="budgetMax">Butce Max</label>
          <input
            id="budgetMax"
            type="number"
            min={0}
            value={filters.budgetMax ?? ''}
            onChange={(event) => handleFilterChange('budgetMax', event.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="deadlineDaysMax">Teslim Suresi (Gun)</label>
          <input
            id="deadlineDaysMax"
            type="number"
            min={1}
            value={filters.deadlineDaysMax ?? ''}
            onChange={(event) => handleFilterChange('deadlineDaysMax', event.target.value)}
          />
        </div>
      </div>

      <div className="delivery-actions" style={{ marginTop: '-4px', marginBottom: '16px' }}>
        <button className="button button-subtle" type="button" onClick={() => void handleApplyFilters()}>
          Filtrele
        </button>
      </div>

      {isLoading ? <p>Loading...</p> : null}
      {error ? <p>{error}</p> : null}

      {!isLoading && !error ? (
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

          {jobs.length === 0 ? <p>Henuz job yok.</p> : null}
        </div>
      ) : null}
    </section>
  )
}
