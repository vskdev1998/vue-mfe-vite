import { useStore } from 'vuex'
import { hostStoreKey } from '@/store'

/**
 * Returns the HOST store. Auto-imported in every component/script via
 * unplugin-auto-import `dirs: ['src/composables']`.
 *
 * Always use this (or useStore(hostStoreKey)) instead of a bare useStore():
 * a bare useStore() looks up the default 'store' key, which the host does not use.
 */
export function useHostStore() {
  return useStore(hostStoreKey)
}
