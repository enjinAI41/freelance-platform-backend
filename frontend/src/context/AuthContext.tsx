/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { authService } from '../api/auth.service'
import type { AuthContextValue, RoleName, User } from '../types/auth'

const ACCESS_TOKEN_KEY = 'accessToken'

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(ACCESS_TOKEN_KEY),
  )
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const logout = () => {
    void authService.logout().catch(() => undefined)
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const login = async (email: string, password: string) => {
    const session = await authService.login(email, password)
    const accessToken = session.accessToken

    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    setToken(accessToken)
    setUser(session.user)
  }

  const register = async (email: string, password: string, role: RoleName) => {
    return authService.register(email, password, role)
  }

  useEffect(() => {
    const bootstrapAuth = async () => {
      if (!token || token === 'undefined' || token === 'null') {
        logout()
        setIsLoading(false)
        return
      }

      try {
        const me = await authService.getMe()
        setUser(me)
      } catch {
        logout()
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrapAuth()
  }, [token])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
      register,
    }),
    [user, token, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
