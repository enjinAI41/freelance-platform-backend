import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageTitle } from '../components/PageTitle'
import { useAuth } from '../context/AuthContext'
import { projectsService } from '../api/projects.service'
import type { Milestone, Project } from '../types/project'

type ProjectStatusFilter = 'ALL' | 'ACTIVE' | 'COMPLETED'

function formatAmount(project: Project): string {
  const currency = project.currency ?? 'TRY'
  return `${currency} ${project.totalAmount}`
}

function getStatusLabel(status: string): string {
  const value = status.toUpperCase()

  if (value === 'ACTIVE') {
    return 'Aktif'
  }

  if (value === 'COMPLETED') {
    return 'Tamamlandı'
  }

  if (value === 'CANCELED' || value === 'CANCELLED') {
    return 'İptal Edildi'
  }

  return status
}

function getMilestoneStatusLabel(status: string): string {
  const value = status.toUpperCase()

  if (value === 'IN_PROGRESS') {
    return 'Devam Ediyor'
  }

  if (value === 'REVISION_REQUESTED') {
    return 'Revizyon İstendi'
  }

  if (value === 'PENDING') {
    return 'Beklemede'
  }

  if (value === 'APPROVED') {
    return 'Onaylandı'
  }

  if (value === 'COMPLETED') {
    return 'Tamamlandı'
  }

  return status
}

function isClosedProject(status: string): boolean {
  const value = status.toUpperCase()
  return value === 'COMPLETED' || value === 'CANCELED' || value === 'CANCELLED'
}

export function ProjectsPage() {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const userId = user?.id !== undefined ? Number(user.id) : null
  const isFreelancer = roles.includes('FREELANCER')
  const isCustomer = roles.includes('CUSTOMER')

  const [projects, setProjects] = useState<Project[]>([])
  const [milestonesByProject, setMilestonesByProject] = useState<Record<number, Milestone[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isMilestoneLoading, setIsMilestoneLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ProjectStatusFilter>('ALL')
  const [searchText, setSearchText] = useState('')
  const [referenceNow, setReferenceNow] = useState<number | null>(null)

  const loadProjects = useCallback(async () => {
    try {
      setError(null)
      const data = await projectsService.list()
      setProjects(data)

      if (data.length === 0) {
        setMilestonesByProject({})
        return
      }

      setIsMilestoneLoading(true)
      setReferenceNow(Date.now())
      const milestoneEntries = await Promise.all(
        data.map(async (project) => {
          try {
            const milestones = await projectsService.listMilestones(project.id)
            return [project.id, milestones] as const
          } catch {
            return [project.id, []] as const
          }
        }),
      )

      setMilestonesByProject(Object.fromEntries(milestoneEntries))
    } catch {
      setError('Projeler alınamadı.')
    } finally {
      setIsMilestoneLoading(false)
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadProjects()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [loadProjects])

  const scopedProjects = useMemo(() => {
    if (userId === null || !Number.isFinite(userId)) {
      return projects
    }

    if (isFreelancer) {
      return projects.filter((project) => project.freelancerId === userId)
    }

    if (isCustomer) {
      return projects.filter((project) => project.customerId === userId)
    }

    return projects
  }, [isCustomer, isFreelancer, projects, userId])

  const filteredProjects = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return scopedProjects.filter((project) => {
      if (statusFilter === 'ACTIVE' && isClosedProject(project.status)) {
        return false
      }

      if (statusFilter === 'COMPLETED' && !isClosedProject(project.status)) {
        return false
      }

      if (!keyword) {
        return true
      }

      const haystack = `${project.title} ${project.summary ?? ''} ${project.jobListing?.title ?? ''}`
      return haystack.toLowerCase().includes(keyword)
    })
  }, [scopedProjects, searchText, statusFilter])

  const projectMetrics = useMemo(() => {
    const activeCount = scopedProjects.filter((project) => !isClosedProject(project.status)).length

    const dueSoonCount = scopedProjects.reduce((total, project) => {
      const milestones = milestonesByProject[project.id] ?? []
      if (referenceNow === null) {
        return total
      }

      const now = referenceNow
      const sevenDaysLater = now + 7 * 24 * 60 * 60 * 1000

      const hasDueSoon = milestones.some((milestone) => {
        if (!milestone.dueDate) {
          return false
        }

        const dueTime = new Date(milestone.dueDate).getTime()
        const status = milestone.status.toUpperCase()
        const isOpen =
          status !== 'APPROVED' &&
          status !== 'COMPLETED' &&
          status !== 'CANCELED' &&
          status !== 'CANCELLED'
        return isOpen && dueTime >= now && dueTime <= sevenDaysLater
      })

      return total + (hasDueSoon ? 1 : 0)
    }, 0)

    const revisionCount = scopedProjects.reduce((total, project) => {
      const milestones = milestonesByProject[project.id] ?? []
      const revisionMilestones = milestones.filter(
        (milestone) => milestone.status.toUpperCase() === 'REVISION_REQUESTED',
      ).length
      return total + revisionMilestones
    }, 0)

    return { activeCount, dueSoonCount, revisionCount }
  }, [milestonesByProject, referenceNow, scopedProjects])

  return (
    <section className="page-card">
      <div className="jobs-header">
        <PageTitle
          title={isFreelancer ? 'Freelancer Proje Masası' : 'Projeler'}
          description={
            isFreelancer
              ? 'Aktif işlerini, yaklaşan teslim risklerini ve revizyon taleplerini tek panelde yönet.'
              : 'Tekliften oluşan proje kayıtları'
          }
        />
        <button className="button button-subtle" type="button" onClick={() => void loadProjects()}>
          Yenile
        </button>
      </div>

      <div className="panel-metric-grid">
        <article className="metric-tile">
          <span>Görünen Proje</span>
          <strong>{isLoading ? '...' : scopedProjects.length}</strong>
        </article>
        <article className="metric-tile">
          <span>Aktif Proje</span>
          <strong>{isLoading ? '...' : projectMetrics.activeCount}</strong>
        </article>
        <article className="metric-tile">
          <span>7 Gün İçinde Teslim Riski</span>
          <strong>{isLoading || isMilestoneLoading ? '...' : projectMetrics.dueSoonCount}</strong>
        </article>
      </div>

      {isFreelancer ? (
        <div className="project-grid filter-grid">
          <div className="form-group">
            <label htmlFor="projectSearch">Proje Ara</label>
            <input
              id="projectSearch"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Proje adı, ilan başlığı veya özet"
            />
          </div>
          <div className="form-group">
            <label htmlFor="projectStatusFilter">Durum Filtresi</label>
            <select
              id="projectStatusFilter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ProjectStatusFilter)}
            >
              <option value="ALL">Tümü</option>
              <option value="ACTIVE">Aktif</option>
              <option value="COMPLETED">Tamamlanan / İptal</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="projectRevisionHint">Revizyon Talepleri</label>
            <input
              id="projectRevisionHint"
              value={
                isLoading || isMilestoneLoading
                  ? 'Yükleniyor...'
                  : `${projectMetrics.revisionCount} aşamada revizyon bekleniyor`
              }
              readOnly
            />
          </div>
        </div>
      ) : null}

      {isLoading ? <p>Yükleniyor...</p> : null}
      {error ? <p className="page-note">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="projects-list">
          {filteredProjects.map((project) => {
            const milestones = milestonesByProject[project.id] ?? []
            const approvedCount = milestones.filter((milestone) => {
              const status = milestone.status.toUpperCase()
              return status === 'APPROVED' || status === 'COMPLETED'
            }).length
            const openCount = milestones.filter((milestone) => {
              const status = milestone.status.toUpperCase()
              return status !== 'APPROVED' && status !== 'COMPLETED' && status !== 'CANCELED' && status !== 'CANCELLED'
            }).length
            const latestMilestone = [...milestones]
              .filter((milestone) => milestone.dueDate)
              .sort(
                (left, right) =>
                  new Date(left.dueDate as string).getTime() -
                  new Date(right.dueDate as string).getTime(),
              )[0]

            return (
            <article className="project-card" key={project.id}>
              <h3>
                <Link to={`/projects/${project.id}`}>{project.jobListing?.title ?? project.title}</Link>
              </h3>
              <p className="job-description">{project.summary ?? 'Özet bulunmuyor.'}</p>

              <div className="project-row">
                <span>Freelancer</span>
                <strong>{project.freelancer?.fullName ?? `Kullanıcı #${project.freelancerId}`}</strong>
              </div>

              <div className="project-row">
                <span>Durum</span>
                <span className="status-badge">{getStatusLabel(project.status)}</span>
              </div>

              <div className="project-row">
                <span>Toplam</span>
                <strong className="budget-pill">{formatAmount(project)}</strong>
              </div>

              <div className="project-row project-milestone-progress">
                <span>Milestone İlerleme</span>
                <strong>
                  {milestones.length === 0
                    ? 'Planlanmadı'
                    : `${approvedCount}/${milestones.length} onaylandı`}
                </strong>
              </div>

              <div className="project-row">
                <span>Açık Aşama</span>
                <strong>{milestones.length === 0 ? '-' : openCount}</strong>
              </div>

              <div className="project-row">
                <span>En Yakın Teslim</span>
                <strong>
                  {latestMilestone?.dueDate
                    ? `${new Date(latestMilestone.dueDate).toLocaleDateString('tr-TR')} · ${getMilestoneStatusLabel(latestMilestone.status)}`
                    : '-'}
                </strong>
              </div>

              <div className="manage-row">
                <span className="table-chip">Milestone: {isMilestoneLoading ? '...' : milestones.length}</span>
                <Link className="button button-subtle" to={`/projects/${project.id}`}>
                  Detayı Aç
                </Link>
              </div>
            </article>
            )
          })}

          {filteredProjects.length === 0 ? <p>Bu filtre için proje bulunamadı.</p> : null}
        </div>
      ) : null}
    </section>
  )
}
