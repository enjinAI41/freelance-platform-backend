import axios, { AxiosHeaders } from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const api = axios.create({
  baseURL: apiBaseUrl,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')

  if (token) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('Authorization', `Bearer ${token}`)
    } else {
      config.headers = config.headers ?? {}
      ;(config.headers as Record<string, string>).Authorization =
        `Bearer ${token}`
    }
  }

  return config
})

export default api
