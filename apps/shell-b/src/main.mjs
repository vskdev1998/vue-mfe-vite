// STANDALONE bootstrap for shell-b (http://localhost:8082).
// The host never executes this file: it imports ./App through remoteEntry.js.
import { createApp } from 'vue'
import App from './App.vue'
import { store, shellBStoreKey } from './store'

// Wait for the host's shared ui-dev library (host/ui-dev) before mounting
await import('host/ui-dev')

const mockUser = { firstName: 'Standalone', lastName: 'Dev', role: 'admin' }

createApp(App, { user: mockUser, standalone: true }).use(store, shellBStoreKey).mount('#app')
