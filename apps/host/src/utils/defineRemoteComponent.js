import { defineAsyncComponent, h } from 'vue'
import RemoteFallback from '@/components/RemoteFallback.vue'

/**
 * Wraps a federated `import('remote/Module')` in defineAsyncComponent with
 * loading + error states, so a remote that is down never breaks the host.
 *
 * @param {() => Promise<any>} loader   e.g. () => import('shellA/App')
 * @param {string} label                human readable remote name
 */
export function defineRemoteComponent(loader, label) {
  return defineAsyncComponent({
    loader,
    delay: 150,
    timeout: 15_000,
    loadingComponent: { render: () => h(RemoteFallback, { label, state: 'loading' }) },
    errorComponent: {
      props: ['error'],
      render() {
        return h(RemoteFallback, { label, state: 'error', error: this.error })
      },
    },
  })
}
