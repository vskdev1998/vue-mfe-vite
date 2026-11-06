import { createStore } from 'vuex'
import tasks from './modules/tasks'

/**
 * SHELL-B Vuex store: independent of host and shell-a.
 * Provided under a private injection key by App.vue (see shell-a for rationale).
 */
export const shellBStoreKey = Symbol('shell-b-store')

export const store = createStore({
  strict: import.meta.env.DEV,
  modules: { tasks },
})
