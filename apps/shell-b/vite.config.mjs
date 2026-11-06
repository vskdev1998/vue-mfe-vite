import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { federation } from '@module-federation/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { readEnv, envBanner } from './config/env.mjs'
import {
  loadFederationJson,
  remoteEnvKeys,
  resolveRemoteUrls,
  createFederationOptions,
} from './config/federation.mjs'

const root = fileURLToPath(new URL('.', import.meta.url))
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const fed = loadFederationJson(root)

/**
 * Resolves every <UiXxx> tag to the host's shared ui-dev library:
 *   <UiButton/>  →  import { UiButton } from 'host/ui-dev'
 * 'host/ui-dev' is a federated module, loaded at runtime from VITE_HOST_ENTRY.
 */
const UiDevResolver = (name) => (/^Ui[A-Z]/.test(name) ? { name, from: 'host/ui-dev' } : undefined)

export default defineConfig(({ command, mode }) => {
  // npm run dev → mode=development → .env + .env.development
  const env = readEnv(mode, root, remoteEnvKeys(fed))

  return {
    // In production the remote's chunks must be requested from its own origin
    base: command === 'build' ? env.publicUrl : '/',

    plugins: [
      envBanner(env, resolveRemoteUrls(fed, env.raw)),
      vue(),
      AutoImport({
        imports: ['vue', 'vuex'],
        dirs: ['src/composables', 'src/utils'],
        dts: false, // plain JavaScript project
        vueTemplate: true,
      }),
      Components({
        dirs: ['src/components'],
        dts: false,
        resolvers: [UiDevResolver],
      }),

      // Module Federation from shared.federation.json (+ remote URLs from .env.[mode]):
      // EXPOSES ./App, CONSUMES host/ui-dev
      federation(createFederationOptions(fed, env.raw, pkg)),
    ],

    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },

    define: {
      __APP_NAME__: JSON.stringify(env.appName),
      __APP_ENV__: JSON.stringify(env.appEnv),
    },

    css: {
      preprocessorOptions: {
        scss: { additionalData: `@use "@/styles/tokens" as *;\n` },
      },
    },

    server: {
      host: env.devHost,
      port: env.port,
      strictPort: true,
      open: env.open,
      // Absolute dev asset URLs so they load correctly inside the host page
      origin: env.origin,
      cors: env.corsOrigins.length ? { origin: env.corsOrigins } : true,
    },
    preview: {
      host: env.devHost,
      port: env.port,
      strictPort: true,
      cors: env.corsOrigins.length ? { origin: env.corsOrigins } : true,
    },

    esbuild: {
      pure: env.dropConsole ? ['console.log', 'console.debug'] : [],
      drop: env.dropConsole ? ['debugger'] : [],
    },

    build: {
      target: 'esnext',
      sourcemap: env.sourcemap,
    },
  }
})
