import { taskService } from '@/services/taskService'
import { emitMfeEvent } from '@/utils/mfeBus'

function broadcast(state) {
  const open = _.filter(state.items, { done: false }).length
  emitMfeEvent('tasks-updated', { open, total: state.items.length })
}

export default {
  namespaced: true,

  state: () => ({
    items: [],
    filter: 'all', // all | open | done
    loading: false,
    error: null,
  }),

  getters: {
    // lodash (auto-imported as `_`)
    visible: (s) =>
      s.filter === 'all' ? s.items : _.filter(s.items, { done: s.filter === 'done' }),
    counts: (s) => {
      const by = _.countBy(s.items, (t) => (t.done ? 'done' : 'open'))
      return { all: s.items.length, open: by.open ?? 0, done: by.done ?? 0 }
    },
  },

  mutations: {
    SET_ITEMS: (s, items) => (s.items = items),
    PREPEND: (s, task) => s.items.unshift(task),
    TOGGLE: (s, id) => {
      const t = _.find(s.items, { id })
      if (t) t.done = !t.done
    },
    REMOVE: (s, id) => (s.items = _.reject(s.items, { id })),
    SET_FILTER: (s, f) => (s.filter = f),
    SET_LOADING: (s, v) => (s.loading = v),
    SET_ERROR: (s, e) => (s.error = e),
  },

  actions: {
    async fetch({ commit, state }) {
      commit('SET_LOADING', true)
      commit('SET_ERROR', null)
      try {
        commit('SET_ITEMS', await taskService.list())
        broadcast(state)
      } catch (e) {
        commit('SET_ERROR', e.message)
      } finally {
        commit('SET_LOADING', false)
      }
    },
    async add({ commit, state }, title) {
      const task = await taskService.create(title)
      commit('PREPEND', task)
      broadcast(state)
    },
    toggle({ commit, state }, id) {
      commit('TOGGLE', id)
      broadcast(state)
    },
    remove({ commit, state }, id) {
      commit('REMOVE', id)
      broadcast(state)
    },
  },
}
