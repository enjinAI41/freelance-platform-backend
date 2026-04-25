import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageTitle } from '../components/PageTitle'
import { projectsService } from '../api/projects.service'
import type { Project } from '../types/project'

function formatAmount(project: Project): string {
  const currency = project.currency ?? 'TRY'
  return `${currency} ${project.totalAmount}`
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setError(null)
        const data = await projectsService.list()
        setProjects(data)
      } catch {
        setError('Projeler alinamadi.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadProjects()
  }, [])

  return (
    <section className="page-card">
      <PageTitle title="Projects" description="Tekliften olusan aktif proje listesi" />

      {isLoading ? <p>Loading...</p> : null}
      {error ? <p className="page-note">{error}</p> : null}

      {!isLoading && !error ? (
        <div className="projects-list">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <h3>
                <Link to={`/projects/${project.id}`}>{project.jobListing?.title ?? project.title}</Link>
              </h3>

              <div className="project-row">
                <span>Freelancer</span>
                <strong>{project.freelancer?.fullName ?? `User #${project.freelancerId}`}</strong>
              </div>

              <div className="project-row">
                <span>Status</span>
                <span className="status-badge">{project.status}</span>
              </div>

              <div className="project-row">
                <span>Total</span>
                <strong className="budget-pill">{formatAmount(project)}</strong>
              </div>
            </article>
          ))}

          {projects.length === 0 ? <p>Henuz proje yok.</p> : null}
        </div>
      ) : null}
    </section>
  )
}
