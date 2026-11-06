import { http } from './http'
import { PRODUCTS } from './fixtures/products'

const FIELDS = 'id,title,price,thumbnail,category,rating'
const forceMock = import.meta.env.VITE_USE_MOCK_API === 'true'

function fromFixtures(q, limit, skip) {
  const term = q.toLowerCase()
  const all = PRODUCTS.filter((p) => !term || `${p.title} ${p.category}`.toLowerCase().includes(term))
  return { products: all.slice(skip, skip + limit), total: all.length, skip, limit, offline: true }
}

export const productService = {
  async list({ q = '', limit = 12, skip = 0 } = {}) {
    if (forceMock) return fromFixtures(q, limit, skip)
    try {
      const url = q ? '/products/search' : '/products'
      const { data } = await http.get(url, {
        params: { q: q || undefined, limit, skip, select: FIELDS },
      })
      return data // { products, total, skip, limit }
    } catch (err) {
      if (!err.isNetworkError) throw err
      console.warn('[shell-a] API unreachable, using offline fixtures:', err.message)
      return fromFixtures(q, limit, skip)
    }
  },
}
