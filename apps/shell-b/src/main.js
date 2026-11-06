// STANDALONE bootstrap for shell-b (http://localhost:5002).
// The host never executes this file: it imports ./App through remoteEntry.js.
import { createApp } from 'vue'
import App from './App.vue'
import { store, shellBStoreKey } from './store'

const mockUser = { firstName: 'Standalone', lastName: 'Dev', role: 'admin' }

createApp(App, { user: mockUser, standalone: true }).use(store, shellBStoreKey).mount('#app')
