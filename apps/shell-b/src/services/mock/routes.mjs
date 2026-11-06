import { createMockAdapter } from './adapter'
import { TASKS } from '../fixtures/tasks'

const routes = [
  {
    method: 'GET',
    path: '/todos',
    handler: ({ query }) => ({
      // jsonplaceholder shape
      data: TASKS.slice(0, Number(query._limit) || TASKS.length).map((t) => ({
        id: t.id,
        title: t.title,
        completed: t.done,
        userId: 1,
      })),
    }),
  },
  {
    method: 'POST',
    path: '/todos',
    handler: ({ body }) => ({ status: 201, data: { ...body, id: 200 + Math.floor(Math.random() * 1000) } }),
  },
]

export const shellBMockAdapter = createMockAdapter(routes, {
  app: 'shell-b',
  expectedKey: import.meta.env.VITE_MOCK_GATEWAY_KEY,
})
