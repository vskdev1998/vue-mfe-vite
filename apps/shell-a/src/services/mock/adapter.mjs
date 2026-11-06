import { AxiosError, AxiosHeaders } from 'axios'
import { GATEWAY_HEADER } from '../gateway'

/**
 * Tiny in-browser mock API implemented as an axios ADAPTER.
 *
 * Requests still go through this app's axios instance (interceptors, headers),
 * only the network call is replaced. Like a real API gateway, the mock first
 * verifies the API gateway key:
 *
 *   request header  [VITE_API_GATEWAY_HEADER] === VITE_MOCK_GATEWAY_KEY   → route handler
 *   missing / wrong                                                        → 401
 *
 * @param {Array<{ method: string, path: string, handler: Function }>} routes
 * @param {{ app: string, expectedKey: string, latency?: number }} options
 */
export function createMockAdapter(routes, { app, expectedKey, latency = 300 }) {
  return async function mockAdapter(config) {
    await new Promise((r) => setTimeout(r, latency))

    const headers = AxiosHeaders.from(config.headers)
    const method = (config.method || 'get').toUpperCase()
    const url = new URL(config.url, 'http://mock.local')
    const query = { ...Object.fromEntries(url.searchParams), ...(config.params || {}) }
    const body = typeof config.data === 'string' ? safeJson(config.data) : config.data

    const respond = (status, data) => {
      const response = {
        data,
        status,
        statusText: status < 400 ? 'OK' : 'Error',
        headers: { 'content-type': 'application/json', 'x-mock-api': app },
        config,
        request: { mock: true },
      }
      if (status >= 400) {
        throw new AxiosError(data?.message || `Mock ${status}`, AxiosError.ERR_BAD_REQUEST, config, response.request, response)
      }
      return response
    }

    // 1) API gateway verification
    const key = headers.get(GATEWAY_HEADER)
    if (!expectedKey) {
      return respond(500, { message: `[mock:${app}] VITE_MOCK_GATEWAY_KEY is not set in .env.${import.meta.env.MODE}` })
    }
    if (!key) {
      return respond(401, { message: `[mock:${app}] missing ${GATEWAY_HEADER} header` })
    }
    if (key !== expectedKey) {
      return respond(401, { message: `[mock:${app}] invalid API gateway key for this app` })
    }

    // 2) routing
    const route = routes.find((r) => r.method === method && r.path === url.pathname)
    if (!route) return respond(404, { message: `[mock:${app}] no route ${method} ${url.pathname}` })

    const { status = 200, data } = await route.handler({ body, query, headers })
    return respond(status, data)
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}
