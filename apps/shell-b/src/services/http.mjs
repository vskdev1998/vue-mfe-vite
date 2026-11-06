import axios from 'axios'
import { AUTH_STORAGE_KEY } from '@/utils/mfeBus'

/**
 * SHELL-B axios instance (private to this micro-frontend).
 *
 * - Own baseURL / timeout / headers / interceptors.
 * - Not shared through Module Federation: axios is NOT in `shared`, so this
 *   remote bundles its own copy and nothing the host configures can leak in.
 * - Auth contract: reads the token the host writes to sessionStorage[AUTH_STORAGE_KEY].
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
    /* ignore */
  }
  return config
})

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const err = new Error(
      error.response?.data?.message || error.message || 'shell-b request failed',
    )
    // No response at all = network / CORS / offline. Services may fall back to fixtures.
    err.isNetworkError = !error.response
    err.status = error.response?.status
    return Promise.reject(err)
  },
)
