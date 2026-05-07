export interface User {
  id?: string | number
  email: string
  roles?: string[]
  [key: string]: unknown
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
  role: RoleName
}

export type RoleName = 'CUSTOMER' | 'FREELANCER' | 'ARBITER'

export interface AuthSession {
  user: User
  accessToken: string
  refreshToken?: string
}

export interface ApiEnvelope<T> {
  success: boolean
  timestamp?: string
  path?: string
  data: T
}

export interface AuthContextValue {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<AuthSession>
  register: (email: string, password: string, role: RoleName) => Promise<AuthSession>
  logout: () => void
}
