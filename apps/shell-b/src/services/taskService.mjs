import { http } from './http'
import { shellBMockAdapter } from './mock/routes'

const forceMock = import.meta.env.VITE_USE_MOCK_API === 'true'

/** GET/POST through shell-b's axios instance; mock adapter when forced or offline. */
async function call(config) {
  try {
    return await http.request(forceMock ? { ...config, adapter: shellBMockAdapter } : config)
  } catch (err) {
    if (forceMock || !err.isNetworkError) throw err
    console.warn('[shell-b] API unreachable, using mock API:', err.message)
    return http.request({ ...config, adapter: shellBMockAdapter })
  }
}

export const taskService = {
  async list({ limit = 15 } = {}) {
    const { data } = await call({ method: 'get', url: '/todos', params: { _limit: limit } })
    return data.map((t) => ({ id: t.id, title: t.title, done: t.completed }))
  },

  async create(title) {
    const { data } = await call({ method: 'post', url: '/todos', data: { title, completed: false, userId: 1 } })
    return { id: `${data.id}-${Date.now()}`, title: data.title, done: false }
  },
}
