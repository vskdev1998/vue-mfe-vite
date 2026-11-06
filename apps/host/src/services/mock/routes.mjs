import { createMockAdapter } from './adapter'

/** Mock users for the sample login (no backend required). */
const MOCK_USERS = [
  { id: 1, username: 'demo', password: 'demo123', firstName: 'Demo', lastName: 'User', role: 'admin' },
  { id: 2, username: 'guest', password: 'guest123', firstName: 'Guest', lastName: 'Viewer', role: 'viewer' },
]

const routes = [
  {
    method: 'POST',
    path: '/auth/login',
    handler({ body }) {
      const match = MOCK_USERS.find((u) => u.username === body?.username && u.password === body?.password)
      if (!match) return { status: 400, data: { message: 'Invalid username or password' } }
      const { password: _omit, ...user } = match
      // Same response shape as dummyjson's /auth/login
      return { data: { ...user, accessToken: `mock.${btoa(user.username)}.${Date.now()}` } }
    },
  },
]

export const hostMockAdapter = createMockAdapter(routes, {
  app: 'host',
  expectedKey: import.meta.env.VITE_MOCK_GATEWAY_KEY,
  latency: 500,
})
