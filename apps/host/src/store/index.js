import { createStore } from 'vuex'
import auth from './modules/auth'
import notifications from './modules/notifications'

/**
 * HOST Vuex store.
 *
 * Each micro-frontend has its OWN store instance and its OWN injection key.
 * This is what keeps the stores isolated even though all apps render inside
 * the same Vue application at runtime: `useStore(hostStoreKey)` can only ever
 * resolve the host store.
 */
export const hostStoreKey = Symbol('host-store')

export const store = createStore({
  strict: import.meta.env.DEV,
  modules: {
    auth,
    notifications,
  },
})
