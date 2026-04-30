const ACCESS_TOKEN_KEY = 'accessToken'

export function useAuthToken() {
  const getToken = () => localStorage.getItem(ACCESS_TOKEN_KEY)

  const setToken = (token: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token)
  }

  const clearToken = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
  }

  return {
    getToken,
    setToken,
    clearToken,
  }
}
