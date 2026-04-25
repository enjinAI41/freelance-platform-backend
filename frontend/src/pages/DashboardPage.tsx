import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { jobsService } from '../api/jobs.service'
import type { Job } from '../types/job'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await jobsService.list()
        setJobs(data)
      } catch {
        setJobs([])
      }
    }

    void loadStats()
  }, [])

  const totalJobs = jobs.length
  const activeJobs = jobs.filter((job) => job.status === 'OPEN').length

  return (
    <section className="dashboard-stack">
      <div className="welcome-card">
        <div>
          <h1>Hos geldin</h1>
          <p>{user?.email ?? '-'}</p>
        </div>
        <button className="button button-subtle" onClick={handleLogout} type="button">
          Logout
        </button>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span>Total Jobs</span>
          <strong>{totalJobs}</strong>
        </article>
        <article className="stat-card">
          <span>Aktif Isler</span>
          <strong>{activeJobs}</strong>
        </article>
      </div>
    </section>
  )
}
