import { http } from './http'
import { hostMockAdapter } from './mock/routes'

const useMock = import.meta.env.VITE_USE_MOCK_AUTH !== 'false'

export const authService = {
  /**
   * Both modes call POST /auth/login through the HOST axios instance, so the
   * request always carries the host's API gateway key:
   *  - mock (VITE_USE_MOCK_AUTH=true): the mock adapter verifies the key against
   *    VITE_MOCK_GATEWAY_KEY, then checks demo/demo123 · guest/guest123
   *  - real: dummyjson.com (emilys / emilyspass)
   *
   * @param {{ username: string, password: string }} credentials
   * @returns {Promise<{ user: object, token: string }>}
   */
  async login({ username, password }) {
    const { data } = await http.post(
      '/auth/login',
      { username, password, expiresInMins: 60 },
      useMock ? { adapter: hostMockAdapter } : undefined,
    )
    const { accessToken, refreshToken: _r, ...user } = data
    return { user, token: accessToken }
  },
}
