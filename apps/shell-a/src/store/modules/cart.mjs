import { emitMfeEvent } from '@/utils/mfeBus'

/** Publish the cart summary so the host can show a badge. */
function broadcast(state) {
  const count = state.lines.reduce((n, l) => n + l.qty, 0)
  emitMfeEvent('cart-updated', {
    count,
    items: state.lines.map(({ id, title, qty }) => ({ id, title, qty })),
  })
}

export default {
  namespaced: true,

  state: () => ({
    lines: [], // { id, title, price, qty }
  }),

  getters: {
    count: (s) => s.lines.reduce((n, l) => n + l.qty, 0),
    total: (s) => s.lines.reduce((sum, l) => sum + l.qty * l.price, 0),
  },

  mutations: {
    ADD(state, product) {
      const line = state.lines.find((l) => l.id === product.id)
      if (line) line.qty++
      else state.lines.push({ id: product.id, title: product.title, price: product.price, qty: 1 })
    },
    REMOVE(state, id) {
      state.lines = state.lines.filter((l) => l.id !== id)
    },
    CLEAR(state) {
      state.lines = []
    },
  },

  actions: {
    add({ commit, state }, product) {
      commit('ADD', product)
      broadcast(state)
    },
    remove({ commit, state }, id) {
      commit('REMOVE', id)
      broadcast(state)
    },
    clear({ commit, state }) {
      commit('CLEAR')
      broadcast(state)
    },
  },
}
