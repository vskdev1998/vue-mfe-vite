import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { federation } from '@module-federation/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { readEnv, envBanner } from './config/env.mjs'

const root = fileURLToPath(new URL('.', import.meta.url))

// .env keys that hold the remotes' remoteEntry.js URLs (validated by readEnv)
const REMOTE_ENV = { shellA: 'VITE_SHELL_A_ENTRY', shellB: 'VITE_SHELL_B_ENTRY' }

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // npm run dev → mode=development → .env + .env.development
  const env = readEnv(mode, root, Object.values(REMOTE_ENV))
  const remoteUrls = Object.fromEntries(Object.entries(REMOTE_ENV).map(([n, k]) => [n, env.raw[k]]))

  return {
    // The host is ALSO a remote (it exposes ui-dev), so its built chunks must be
    // requested from the host's own origin when another app loads them.
    base: command === 'build' ? env.publicUrl : '/',

    plugins: [
      envBanner(env, remoteUrls),
      vue(),

      // Auto-import APIs: no more `import { ref, computed } from 'vue'`
      AutoImport({
        imports: ['vue', 'vue-router', 'vuex'],
        dirs: ['src/composables', 'src/utils'],
        dts: false, // plain JavaScript project: no .d.ts files
        vueTemplate: true,
      }),

      // Auto-register components from src/components AND the ui-dev library
      Components({
        dirs: ['src/components', 'src/ui-dev/components'],
        extensions: ['vue'],
        dts: false,
      }),

      // Module Federation: the host CONSUMES shell-a / shell-b (URLs from .env.[mode])
      // and EXPOSES the ui-dev component library to them.
      federation({
        name: 'host',
        filename: 'remoteEntry.js',
        dts: false, // plain JavaScript project
        exposes: {
          // remotes: import { UiButton } from 'host/ui-dev'
          './ui-dev': './src/ui-dev/index.mjs',
        },
        remotes: {
          shellA: {
            type: 'module',
            name: 'shellA',
            entry: remoteUrls.shellA,
            entryGlobalName: 'shellA',
            shareScope: 'default',
          },
          shellB: {
            type: 'module',
            name: 'shellB',
            entry: remoteUrls.shellB,
            entryGlobalName: 'shellB',
            shareScope: 'default',
          },
        },
        // Only the framework runtime is shared. axios and vuex are NOT shared:
        // every app owns its own axios instance and its own Vuex store.
        shared: {
          vue: { singleton: true, requiredVersion: '^3.5.0' },
        },
        // Ship ui-dev's CSS together with the exposed module
        bundleAllCSS: true,
        // Don't fetch every remoteEntry up front to negotiate shared versions.
        // Matters when a remote loads host/ui-dev standalone: the host's own
        // remotes (shell-a/shell-b) must not be fetched in that case.
        shareStrategy: 'loaded-first',
      }),
    ],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    // Compile-time constants (replaced in the bundle)
    define: {
      __APP_NAME__: JSON.stringify(env.appName),
      __APP_ENV__: JSON.stringify(env.appEnv),
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
      host: env.devHost,
      port: env.port,
      strictPort: true,
      open: env.open,
      origin: env.origin, // absolute dev URLs, needed because remotes load host/ui-dev
      cors: env.corsOrigins.length ? { origin: env.corsOrigins } : true,
    },
    preview: {
      host: env.devHost,
      port: env.port,
      strictPort: true,
      cors: env.corsOrigins.length ? { origin: env.corsOrigins } : true,
    },

    esbuild: {
      // Strip console.log/debug in builds that ask for it (warn/error are kept)
      pure: env.dropConsole ? ['console.log', 'console.debug'] : [],
      drop: env.dropConsole ? ['debugger'] : [],
    },

    build: {
      // Module Federation runtime relies on top-level await
      target: 'esnext',
      sourcemap: env.sourcemap,
    },
  }
})
