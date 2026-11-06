/**
 * notifications module (namespaced)
 * Holds what the host learns from remotes through the event bus
 * (e.g. cart count from shell-a, open task count from shell-b).
 * The remotes never touch this store directly.
 */
export default {
  namespaced: true,

  state: () => ({
    cartCount: 0,
    openTasks: null,
    lastEvent: null,
  }),

  mutations: {
    SET_CART_COUNT(state, count) {
      state.cartCount = count
    },
    SET_OPEN_TASKS(state, count) {
      state.openTasks = count
    },
    SET_LAST_EVENT(state, evt) {
      state.lastEvent = evt
    },
  },
}
