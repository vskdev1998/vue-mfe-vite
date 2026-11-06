import { createMockAdapter } from './adapter'
import { PRODUCTS } from '../fixtures/products'

function page(list, { limit = 12, skip = 0 }) {
  limit = Number(limit)
  skip = Number(skip)
  return { products: list.slice(skip, skip + limit), total: list.length, skip, limit, mock: true }
}

const routes = [
  { method: 'GET', path: '/products', handler: ({ query }) => ({ data: page(PRODUCTS, query) }) },
  {
    method: 'GET',
    path: '/products/search',
    handler({ query }) {
      const term = String(query.q || '').toLowerCase()
      const hits = PRODUCTS.filter((p) => `${p.title} ${p.category}`.toLowerCase().includes(term))
      return { data: page(hits, query) }
    },
  },
]

export const shellAMockAdapter = createMockAdapter(routes, {
  app: 'shell-a',
  expectedKey: import.meta.env.VITE_MOCK_GATEWAY_KEY,
})
