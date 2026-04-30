import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageTitle } from '../components/PageTitle'
import { disputesService } from '../api/disputes.service'
import { jobsService } from '../api/jobs.service'
import { projectsService } from '../api/projects.service'
import { paymentsService } from '../api/payments.service'
import type { Job } from '../types/job'
import type { Milestone, Project } from '../types/project'
import type { Dispute } from '../types/dispute'
import type { WalletSummary } from '../types/payment'

type DashboardMetric = {
  label: string
  value: string
  accent?: 'warning' | 'success'
}

type UpcomingMilestone = {
  id: number
  projectId: number
  projectTitle: string
  title: string
  dueDate: string | null
  status: string
}

type FreelancerOpsSummary = {
  openMilestones: number
  revisionCount: number
  dueSoonCount: number
}

function getPrimaryRole(roles: string[]): 'CUSTOMER' | 'FREELANCER' | 'ARBITER' {
  if (roles.includes('CUSTOMER')) {
    return 'CUSTOMER'
  }

  if (roles.includes('FREELANCER')) {
    return 'FREELANCER'
  }

  return 'ARBITER'
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const roles = user?.roles ?? []
  const userId = user?.id !== undefined ? Number(user.id) : null
  const primaryRole = getPrimaryRole(roles)
  const [jobs, setJobs] = useState<Job[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [upcomingMilestones, setUpcomingMilestones] = useState<UpcomingMilestone[]>([])
  const [revisionMilestones, setRevisionMilestones] = useState<UpcomingMilestone[]>([])
  const [freelancerOps, setFreelancerOps] = useState<FreelancerOpsSummary>({
    openMilestones: 0,
    revisionCount: 0,
    dueSoonCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true)
      const [jobsResult, projectsResult, disputesResult, walletResult] =
        await Promise.allSettled([
          jobsService.list(),
          projectsService.list(),
          primaryRole === 'ARBITER' ? disputesService.list('OPEN') : Promise.resolve([]),
          primaryRole !== 'ARBITER' ? paymentsService.getWalletSummary() : Promise.resolve(null),
        ])

      const jobsData = jobsResult.status === 'fulfilled' ? jobsResult.value : []
      const projectsData = projectsResult.status === 'fulfilled' ? projectsResult.value : []
      const scopedProjects =
        primaryRole === 'FREELANCER' && userId !== null && Number.isFinite(userId)
          ? projectsData.filter((project) => project.freelancerId === userId)
          : primaryRole === 'CUSTOMER' && userId !== null && Number.isFinite(userId)
            ? projectsData.filter((project) => project.customerId === userId)
            : projectsData

      setJobs(jobsData)
      setProjects(scopedProjects)
      setDisputes(disputesResult.status === 'fulfilled' ? disputesResult.value : [])
      setWallet(walletResult.status === 'fulfilled' ? walletResult.value : null)

      if (primaryRole === 'FREELANCER' && scopedProjects.length > 0) {
        const milestoneGroups = await Promise.all(
          scopedProjects.map(async (project) => {
            try {
              const milestones = await projectsService.listMilestones(project.id)
              return milestones.map((milestone) => ({
                ...milestone,
                projectId: project.id,
                projectTitle: project.jobListing?.title ?? project.title,
              }))
            } catch {
              return [] as Array<Milestone & { projectTitle: string; projectId: number }>
            }
          }),
        )

        const allMilestones = milestoneGroups.flat()
        const pendingMilestones = allMilestones
          .filter((milestone) => {
            const status = milestone.status.toUpperCase()
            return (
              status !== 'APPROVED' &&
              status !== 'COMPLETED' &&
              status !== 'CANCELED' &&
              status !== 'CANCELLED'
            )
          })
          .sort((left, right) => {
            if (!left.dueDate) {
              return 1
            }
            if (!right.dueDate) {
              return -1
            }
            return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
          })
          .slice(0, 5)
          .map((milestone) => ({
            id: milestone.id,
            projectId: milestone.projectId,
            projectTitle: milestone.projectTitle,
            title: milestone.title,
            dueDate: milestone.dueDate,
            status: milestone.status,
          }))

        const revisionList = allMilestones
          .filter((milestone) => milestone.status.toUpperCase() === 'REVISION_REQUESTED')
          .slice(0, 4)
          .map((milestone) => ({
            id: milestone.id,
            projectId: milestone.projectId,
            projectTitle: milestone.projectTitle,
            title: milestone.title,
            dueDate: milestone.dueDate,
            status: milestone.status,
          }))

        const now = Date.now()
        const sevenDaysLater = now + 7 * 24 * 60 * 60 * 1000
        const dueSoonCount = pendingMilestones.filter((milestone) => {
          if (!milestone.dueDate) {
            return false
          }

          const dueAt = new Date(milestone.dueDate).getTime()
          return dueAt >= now && dueAt <= sevenDaysLater
        }).length

        setUpcomingMilestones(pendingMilestones)
        setRevisionMilestones(revisionList)
        setFreelancerOps({
          openMilestones: pendingMilestones.length,
          revisionCount: revisionList.length,
          dueSoonCount,
        })
      } else {
        setUpcomingMilestones([])
        setRevisionMilestones([])
        setFreelancerOps({
          openMilestones: 0,
          revisionCount: 0,
          dueSoonCount: 0,
        })
      }

      setIsLoading(false)
    }

    void loadStats()
  }, [primaryRole, userId])

  const totalJobs = jobs.length.toString()
  const activeJobs = jobs.filter((job) => (job.status ?? '').toUpperCase() === 'OPEN').length.toString()
  const activeProjects = projects
    .filter((project) => {
      const status = project.status.toUpperCase()
      return status !== 'COMPLETED' && status !== 'CANCELED'
    })
    .length.toString()
  const openDisputes = disputes.length.toString()
  const releasedAmount = wallet ? `${wallet.currency ?? 'TRY'} ${wallet.releasedAmount}` : '-'

  const roleTitle =
    primaryRole === 'CUSTOMER'
      ? 'Müşteri Kontrol Paneli'
      : primaryRole === 'FREELANCER'
        ? 'Freelancer Kontrol Paneli'
        : 'Hakem Kontrol Paneli'

  const roleHint =
    primaryRole === 'CUSTOMER'
      ? 'İlanları yönet, teklifleri değerlendir ve proje akışlarını takip et.'
      : primaryRole === 'FREELANCER'
        ? 'Aktif işleri takip et, milestone teslimlerini ilerlet ve ödemeleri kontrol et.'
        : 'Açılan uyuşmazlıkları incele, kararlarını kaydet ve süreci kapat.'

  const metrics: DashboardMetric[] =
    primaryRole === 'ARBITER'
      ? [
          { label: 'Açılan Uyuşmazlık', value: openDisputes, accent: 'warning' },
          { label: 'Toplam Proje Kaydı', value: projects.length.toString() },
          { label: 'Açık İş İlanı', value: activeJobs },
        ]
      : primaryRole === 'FREELANCER'
        ? [
            { label: 'Açık Milestone', value: freelancerOps.openMilestones.toString(), accent: 'success' },
            { label: 'Revizyon Uyarısı', value: freelancerOps.revisionCount.toString(), accent: 'warning' },
            { label: '7 Gün İçinde Teslim', value: freelancerOps.dueSoonCount.toString() },
          ]
      : [
          { label: 'Toplam İş İlanı', value: totalJobs },
          { label: 'Aktif Proje', value: activeProjects, accent: 'success' },
          { label: 'Serbest Bırakılan Ödeme', value: releasedAmount },
        ]

  const featuredJobs = jobs
    .filter((job) => (job.status ?? '').toUpperCase() === 'OPEN')
    .slice(0, 3)

  const focusMilestones = [...upcomingMilestones]
    .sort((left, right) => {
      const leftRevision = left.status.toUpperCase() === 'REVISION_REQUESTED'
      const rightRevision = right.status.toUpperCase() === 'REVISION_REQUESTED'

      if (leftRevision && !rightRevision) {
        return -1
      }
      if (!leftRevision && rightRevision) {
        return 1
      }

      if (!left.dueDate) {
        return 1
      }
      if (!right.dueDate) {
        return -1
      }

      return new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
    })
    .slice(0, 3)

  const getMilestoneStatusLabel = (status: string) => {
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
    return status
  }

  return (
    <section className="dashboard-stack">
      <div className="welcome-card reveal">
        <div>
          <p className="kicker-text">{roleTitle}</p>
          <h1>Hoş geldin</h1>
          <p>{roleHint}</p>
          <p className="user-meta">{user?.email ?? '-'}</p>
        </div>
        <button className="button button-subtle" onClick={handleLogout} type="button">
          Oturumu Kapat
        </button>
      </div>

      <div className="stats-grid">
        {metrics.map((metric) => (
          <article className={`stat-card reveal ${metric.accent ?? ''}`.trim()} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{isLoading ? '...' : metric.value}</strong>
          </article>
        ))}
      </div>

      <div className="quick-grid">
        {primaryRole === 'CUSTOMER' ? (
          <>
            <Link className="quick-card reveal" to="/jobs/create">
              <h3>Yeni İlan Aç</h3>
              <p>Bütçe, süre ve açıklama ile yeni ilanını yayınla.</p>
            </Link>
            <Link className="quick-card reveal" to="/projects">
              <h3>Proje Takibi</h3>
              <p>Milestone durumlarını kontrol et ve teslimleri yönet.</p>
            </Link>
          </>
        ) : null}

        {primaryRole === 'FREELANCER' ? (
          <>
            <Link className="quick-card reveal" to="/projects">
              <h3>Proje Masası</h3>
              <p>Aktif işlerini ve teslim adımlarını sade görünümde yönet.</p>
            </Link>
            <Link className="quick-card reveal" to="/wallet">
              <h3>Ödeme Merkezi</h3>
              <p>Serbest bırakılan ödemeler ve transfer geçmişini takip et.</p>
            </Link>
          </>
        ) : null}

        {primaryRole === 'ARBITER' ? (
          <>
            <Link className="quick-card reveal" to="/arbiter-desk">
              <h3>Hakem Masasına Git</h3>
              <p>Aktif dosyaları inceleyip karar notlarını oluştur.</p>
            </Link>
            <Link className="quick-card reveal" to="/projects">
              <h3>Proje Kayıtları</h3>
              <p>Uyuşmazlığa bağlı proje ve milestone bağlamını hızla kontrol et.</p>
            </Link>
          </>
        ) : null}
      </div>

      {primaryRole === 'FREELANCER' ? (
        <section className="freelancer-panel reveal">
          <div className="jobs-header">
            <PageTitle
              title="Bugünün Odak Planı"
              description="Öncelikli teslimleri gör, kritik revizyonları kapat ve yeni fırsatlara kısa yoldan geç."
            />
            <Link className="button button-subtle" to="/projects">
              Proje Masasına Git
            </Link>
          </div>

          <div className="freelancer-focus-grid">
            <article className="focus-card">
              <h3>Öncelikli Teslimler</h3>
              {focusMilestones.length > 0 ? (
                <div className="focus-list">
                  {focusMilestones.map((milestone) => (
                    <div key={milestone.id} className="focus-item">
                      <div className="focus-top">
                        <span className="table-chip">{getMilestoneStatusLabel(milestone.status)}</span>
                        <Link to={`/projects/${milestone.projectId}`}>Projeye Git</Link>
                      </div>
                      <strong>{milestone.title}</strong>
                      <span>{milestone.projectTitle}</span>
                      <span>
                        {milestone.dueDate
                          ? `Son tarih: ${new Date(milestone.dueDate).toLocaleDateString('tr-TR')}`
                          : 'Tarih belirtilmedi'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="page-note">Bekleyen milestone teslimi bulunmuyor.</p>
              )}
            </article>

            <article className="focus-card">
              <h3>Fırsatlar ve Uyarılar</h3>
              <p className="page-note">
                Revizyon bekleyen aşama: <strong>{isLoading ? '...' : revisionMilestones.length}</strong>
              </p>
              {revisionMilestones.length > 0 ? (
                <div className="focus-list">
                  {revisionMilestones.slice(0, 2).map((milestone) => (
                    <div key={`revision-${milestone.id}`} className="focus-item">
                      <div className="focus-top">
                        <span className="table-chip">{getMilestoneStatusLabel(milestone.status)}</span>
                        <Link to={`/projects/${milestone.projectId}`}>Teslim Merkezi</Link>
                      </div>
                      <strong>{milestone.title}</strong>
                      <span>{milestone.projectTitle}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="page-note">Aktif revizyon uyarısı bulunmuyor.</p>
              )}

              <h4>Öne Çıkan Açık İlanlar</h4>
              {featuredJobs.length > 0 ? (
                <div className="focus-list">
                  {featuredJobs.map((job) => (
                    <div key={job.id} className="focus-item">
                      <div className="focus-top">
                        <span className="table-chip">Açık</span>
                        <Link to={`/jobs/${job.id}`}>İlan Detayı</Link>
                      </div>
                      <strong>{job.title}</strong>
                      <span>
                        {job.currency ?? 'TRY'} {job.budgetMin ?? '-'}
                        {job.budgetMax !== null && job.budgetMax !== job.budgetMin
                          ? ` - ${job.budgetMax}`
                          : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="page-note">Açık ilan bulunamadı.</p>
              )}
            </article>
          </div>
        </section>
      ) : null}
    </section>
  )
}
