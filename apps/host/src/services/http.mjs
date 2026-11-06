import axios from 'axios'
import { AUTH_STORAGE_KEY } from '@/utils/mfeBus'
import { GATEWAY_HEADER, GATEWAY_KEY } from './gateway'

/**
 * HOST axios instance.
 *
 * This is deliberately NOT shared through Module Federation and NOT the global
 * `axios` default instance. shell-a and shell-b create their own instances with
 * their own baseURL, timeouts, interceptors and API GATEWAY KEY.
 */
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 10_000,
  headers: {
    'X-Client-App': import.meta.env.VITE_APP_NAME,
    // Every request from the host carries the HOST's gateway key
    [GATEWAY_HEADER]: GATEWAY_KEY,
  },
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
    const err = new Error(message, { cause: error })
    err.status = error.response?.status
    err.isNetworkError = !error.response
    return Promise.reject(err)
  },
)
