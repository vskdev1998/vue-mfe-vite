import { http } from './http'
import { shellAMockAdapter } from './mock/routes'

const FIELDS = 'id,title,price,thumbnail,category,rating'
const forceMock = import.meta.env.VITE_USE_MOCK_API === 'true'

export const productService = {
  /**
   * Real API: dummyjson. Mock: same request through the same axios instance,
   * answered by the mock adapter after it verified shell-a's gateway key.
   * If the real API is unreachable (offline / proxy) we fall back to the mock.
   */
  async list({ q = '', limit = 12, skip = 0 } = {}) {
    const url = q ? '/products/search' : '/products'
    const config = { params: { q: q || undefined, limit, skip, select: FIELDS } }
    try {
      const { data } = await http.get(url, forceMock ? { ...config, adapter: shellAMockAdapter } : config)
      return data
    } catch (err) {
      if (forceMock || !err.isNetworkError) throw err
      console.warn('[shell-a] API unreachable, using mock API:', err.message)
      const { data } = await http.get(url, { ...config, adapter: shellAMockAdapter })
      return data
    }
  },
}
