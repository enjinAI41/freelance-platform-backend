import axios, { AxiosHeaders } from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3000',
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
