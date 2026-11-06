import { useStore } from 'vuex'
import { shellBStoreKey } from '@/store'

/** Returns shell-b's own store (auto-imported). */
export function useShellBStore() {
  return useStore(shellBStoreKey)
}
