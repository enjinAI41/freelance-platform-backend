import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout'
import { CreateJobPage } from '../pages/CreateJobPage'
import { DashboardPage } from '../pages/DashboardPage'
import { JobDetailPage } from '../pages/JobDetailPage'
import { JobsPage } from '../pages/JobsPage'
import { LoginPage } from '../pages/LoginPage'
import { ArbiterDeskPage } from '../pages/ArbiterDeskPage'
import { DisputesPage } from '../pages/DisputesPage'
import { ProjectDetailPage } from '../pages/ProjectDetailPage'
import { ProjectsPage } from '../pages/ProjectsPage'
import { RegisterPage } from '../pages/RegisterPage'
import { ReportsPage } from '../pages/ReportsPage'
import { WalletPage } from '../pages/WalletPage'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/create" element={<CreateJobPage />} />
          <Route path="jobs/:id" element={<JobDetailPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="disputes" element={<DisputesPage />} />
          <Route path="wallet" element={<WalletPage />} />
          <Route path="arbiter-desk" element={<ArbiterDeskPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
