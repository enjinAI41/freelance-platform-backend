import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { RoleName } from '../types/auth'

type ProtectedRouteProps = {
  allowedRoles?: RoleName[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { token, isLoading, user } = useAuth()

  if (isLoading) {
    return <p>Yükleniyor...</p>
  }

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const roles = user?.roles ?? []
    const hasAllowedRole = allowedRoles.some((role) => roles.includes(role))
    if (!hasAllowedRole) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <Outlet />
}
