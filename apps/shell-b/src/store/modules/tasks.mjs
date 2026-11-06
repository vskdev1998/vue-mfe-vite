import { taskService } from '@/services/taskService'
import { emitMfeEvent } from '@/utils/mfeBus'

function broadcast(state) {
  const open = state.items.filter((t) => !t.done).length
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
    visible: (s) =>
      s.filter === 'open'
        ? s.items.filter((t) => !t.done)
        : s.filter === 'done'
          ? s.items.filter((t) => t.done)
          : s.items,
    counts: (s) => ({
      all: s.items.length,
      open: s.items.filter((t) => !t.done).length,
      done: s.items.filter((t) => t.done).length,
    }),
  },

  mutations: {
    SET_ITEMS: (s, items) => (s.items = items),
    PREPEND: (s, task) => s.items.unshift(task),
    TOGGLE: (s, id) => {
      const t = s.items.find((x) => x.id === id)
      if (t) t.done = !t.done
    },
    REMOVE: (s, id) => (s.items = s.items.filter((x) => x.id !== id)),
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
