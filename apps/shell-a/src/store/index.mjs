import { createStore } from 'vuex'
import catalog from './modules/catalog'
import cart from './modules/cart'

/**
 * SHELL-A Vuex store: completely independent from the host store.
 *
 * When the host renders <ShellA/>, everything runs in ONE Vue app instance.
 * A bare `useStore()` would therefore look for the default 'store' key.
 * We avoid that by using a private injection key that App.vue `provide`s,
 * so this subtree always resolves this store.
 */
export const shellAStoreKey = Symbol('shell-a-store')

export const store = createStore({
  strict: import.meta.env.DEV,
  modules: { catalog, cart },
})
