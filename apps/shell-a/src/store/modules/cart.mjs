import { emitMfeEvent } from '@/utils/mfeBus'

/** Publish the cart summary so the host can show a badge. */
function broadcast(state) {
  const count = _.sumBy(state.lines, 'qty')
  emitMfeEvent('cart-updated', {
    count,
    items: _.map(state.lines, (l) => _.pick(l, ['id', 'title', 'qty'])),
  })
}

export default {
  namespaced: true,

  state: () => ({
    lines: [], // { id, title, price, qty }
  }),

  getters: {
    // lodash (auto-imported as `_`)
    count: (s) => _.sumBy(s.lines, 'qty'),
    total: (s) => _.round(_.sumBy(s.lines, (l) => l.qty * l.price), 2),
  },

  mutations: {
    ADD(state, product) {
      const line = _.find(state.lines, { id: product.id })
      if (line) line.qty++
      else state.lines.push({ id: product.id, title: product.title, price: product.price, qty: 1 })
    },
    REMOVE(state, id) {
      state.lines = _.reject(state.lines, { id })
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
