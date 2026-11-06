import { http } from './http'

const useMock = import.meta.env.VITE_USE_MOCK_AUTH !== 'false'

/** Mock users for the sample login (no backend required). */
const MOCK_USERS = [
  { username: 'demo', password: 'demo123', firstName: 'Demo', lastName: 'User', role: 'admin' },
  { username: 'guest', password: 'guest123', firstName: 'Guest', lastName: 'Viewer', role: 'viewer' },
]

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export const authService = {
  /**
   * @param {{ username: string, password: string }} credentials
   * @returns {Promise<{ user: object, token: string }>}
   */
  async login({ username, password }) {
    if (useMock) {
      await delay(500)
      const match = MOCK_USERS.find(
        (u) => u.username === username && u.password === password,
      )
      if (!match) throw new Error('Invalid username or password')
      const { password: _omit, ...user } = match
      return { user, token: `mock.${btoa(username)}.${Date.now()}` }
    }

    // Real API (dummyjson.com). Try emilys / emilyspass
    const { data } = await http.post('/auth/login', { username, password, expiresInMins: 60 })
    const { accessToken, refreshToken, ...user } = data
    return { user, token: accessToken }
  },
}
