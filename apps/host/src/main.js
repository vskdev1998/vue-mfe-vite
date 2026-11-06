// Host entry point.
// Note: no `import { createApp } from 'vue'` needed for most APIs thanks to
// unplugin-auto-import, but entry files stay explicit for readability.
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { store, hostStoreKey } from './store'
import './styles/main.scss'

const app = createApp(App)

// The host's Vuex store is installed under its OWN injection key, so it can never
// collide with the stores of shell-a / shell-b (they use their own keys too).
app.use(store, hostStoreKey)
app.use(router)

// Restore an existing session (sessionStorage) before the first navigation
store.dispatch('auth/restore')

app.mount('#app')
