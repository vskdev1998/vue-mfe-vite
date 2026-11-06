import { http } from './http'
import { TASKS } from './fixtures/tasks'

const forceMock = import.meta.env.VITE_USE_MOCK_API === 'true'
const localTask = (title) => ({ id: `local-${Date.now()}`, title, done: false })

export const taskService = {
  /** jsonplaceholder todos → our task shape */
  async list({ limit = 15 } = {}) {
    if (forceMock) return TASKS.map((t) => ({ ...t }))
    try {
      const { data } = await http.get('/todos', { params: { _limit: limit } })
      return data.map((t) => ({ id: t.id, title: t.title, done: t.completed }))
    } catch (err) {
      if (!err.isNetworkError) throw err
      console.warn('[shell-b] API unreachable, using offline fixtures:', err.message)
      return TASKS.map((t) => ({ ...t }))
    }
  },

  /** jsonplaceholder fakes persistence and echoes the object back with an id */
  async create(title) {
    if (forceMock) return localTask(title)
    try {
      const { data } = await http.post('/todos', { title, completed: false, userId: 1 })
      return { id: `${data.id}-${Date.now()}`, title: data.title, done: false }
    } catch (err) {
      if (!err.isNetworkError) throw err
      return localTask(title)
    }
  },
}
