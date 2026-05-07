import api from './axios'
import type {
  ApiEnvelope,
  AuthSession,
  LoginInput,
  RegisterInput,
  RoleName,
  User,
} from '../types/auth'

function unwrapResponse<T>(payload: T | ApiEnvelope<T>): T {
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'data' in payload
  ) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export const authService = {
  async login(email: string, password: string): Promise<AuthSession> {
    const payload: LoginInput = { email, password }
    const { data } = await api.post<ApiEnvelope<AuthSession>>('/auth/login', payload)
    return unwrapResponse(data)
  },

  async register(
    email: string,
    password: string,
    role: RoleName,
  ): Promise<AuthSession> {
    const payload: RegisterInput = { email, password, role }
    const { data } = await api.post<ApiEnvelope<AuthSession>>('/auth/register', payload)
    return unwrapResponse(data)
  },

  async getMe(): Promise<User> {
    const { data } = await api.get<ApiEnvelope<User>>('/auth/me')
    return unwrapResponse(data)
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },
}
