import axios from 'axios'
import { AUTH_STORAGE_KEY } from '@/utils/mfeBus'

/**
 * HOST axios instance.
 *
 * This is deliberately NOT shared through Module Federation and NOT the global
 * `axios` default instance. shell-a and shell-b create their own instances with
 * their own baseURL, timeouts and interceptors. Changing interceptors here can
 * never affect a remote (and vice versa).
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 10_000,
  headers: { 'X-Client-App': import.meta.env.VITE_APP_NAME },
})

http.interceptors.request.use((config) => {
  try {
    const session = JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || 'null')
    if (session?.token) config.headers.Authorization = `Bearer ${session.token}`
  } catch {
    /* ignore malformed session */
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Network error (host)'
    return Promise.reject(Object.assign(new Error(message), { cause: error }))
  },
)
