import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageTitle } from '../components/PageTitle'
import { jobsService } from '../api/jobs.service'
import type { Job } from '../types/job'

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

  useEffect(() => {
    const loadJobs = async () => {
      try {
        setError(null)
        const data = await jobsService.list()
        setJobs(data)
      } catch {
        setError('Jobs listesi alinamadi.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadJobs()
  }, [])

  return (
    <section className="page-card">
      <div className="jobs-header">
        <PageTitle title="Jobs" description="Tum is ilanlari" />
        <Link className="button" to="/jobs/create">
          New Job
        </Link>
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
