import { productService } from '@/services/productService'

export default {
  namespaced: true,

  state: () => ({
    items: [],
    total: 0,
    query: '',
    loading: false,
    error: null,
  }),

  getters: {
    isEmpty: (s) => !s.loading && s.items.length === 0,
  },

  mutations: {
    SET_QUERY: (s, q) => (s.query = q),
    SET_LOADING: (s, v) => (s.loading = v),
    SET_ERROR: (s, e) => (s.error = e),
    SET_RESULT: (s, { products, total }) => {
      s.items = products
      s.total = total
    },
  },

  actions: {
    async fetch({ commit, state }, query = state.query) {
      commit('SET_QUERY', query)
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      try {
        commit('SET_RESULT', await productService.list({ q: query }))
      } catch (e) {
        commit('SET_ERROR', e.message)
      } finally {
        commit('SET_LOADING', false)
      }
    },
  },
}
