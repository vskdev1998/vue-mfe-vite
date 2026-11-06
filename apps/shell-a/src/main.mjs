// STANDALONE bootstrap for shell-a (http://localhost:5001).
// The host never executes this file: it imports ./App through remoteEntry.js.
import { createApp } from 'vue'
import App from './App.vue'
import { store, shellAStoreKey } from './store'

// Wait for the host's shared ui-dev library (host/ui-dev) before mounting
await import('host/ui-dev')

const mockUser = { firstName: 'Standalone', lastName: 'Dev', role: 'admin' }

createApp(App, { user: mockUser, standalone: true }).use(store, shellAStoreKey).mount('#app')
