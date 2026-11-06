import { useStore } from 'vuex'
import { shellAStoreKey } from '@/store'

/** Returns shell-a's own store (auto-imported). */
export function useShellAStore() {
  return useStore(shellAStoreKey)
}
