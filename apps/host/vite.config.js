import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { federation } from '@module-federation/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env, .env.[mode], .env.local ... (all vars, not only VITE_*)
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.VITE_PORT || 5000)

  // Fail fast if a remote URL is missing for this mode
  for (const key of ['VITE_SHELL_A_ENTRY', 'VITE_SHELL_B_ENTRY']) {
    if (!env[key]) throw new Error(`[host] ${key} is not set for mode "${mode}" (see .env.example)`)
  }

  return {
    plugins: [
      vue(),

      // Auto-import APIs: no more `import { ref, computed } from 'vue'`
      AutoImport({
        imports: ['vue', 'vue-router', 'vuex'],
        // our own composables / helpers are auto-imported too
        dirs: ['src/composables', 'src/utils'],
        dts: 'src/auto-imports.d.ts',
        vueTemplate: true,
      }),

      // Auto-register components from src/components (no manual import/registration)
      Components({
        dirs: ['src/components'],
        extensions: ['vue'],
        dts: 'src/components.d.ts',
      }),

      // Module Federation: the host CONSUMES remotes
      federation({
        name: 'host',
        remotes: {
          shellA: {
            type: 'module',
            name: 'shellA',
            entry: env.VITE_SHELL_A_ENTRY,
            entryGlobalName: 'shellA',
            shareScope: 'default',
          },
          shellB: {
            type: 'module',
            name: 'shellB',
            entry: env.VITE_SHELL_B_ENTRY,
            entryGlobalName: 'shellB',
            shareScope: 'default',
          },
        },
        filename: 'remoteEntry.js',
        // Plain-JS project: skip federated .d.ts generation (needs a tsconfig)
        dts: false,
        // Only framework runtime is shared. axios and vuex are intentionally NOT
        // shared: every app owns its own axios instance and its own Vuex store.
        shared: {
          vue: { singleton: true, requiredVersion: '^3.5.0' },
        },
      }),
    ],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    css: {
      preprocessorOptions: {
        scss: {
          // Vite 7 uses the modern Sass compiler API by default.
          // Inject design tokens + mixins into every <style lang="scss">.
          additionalData: `@use "@/styles/tokens" as *;\n`,
        },
      },
    },

    server: {
      port,
      strictPort: true,
    },
    preview: {
      port,
      strictPort: true,
    },

    build: {
      // Module Federation runtime relies on top-level await
      target: 'esnext',
    },
  }
})
