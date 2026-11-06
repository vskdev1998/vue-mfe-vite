import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { federation } from '@module-federation/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number(env.VITE_PORT || 5001)
  const publicUrl = env.VITE_PUBLIC_URL || `http://localhost:${port}/`

  return {
    // In production the remote's assets must be requested from the remote's own origin.
    base: command === 'build' ? publicUrl : '/',

    plugins: [
      vue(),
      AutoImport({
        imports: ['vue', 'vuex'],
        dirs: ['src/composables', 'src/utils'],
        dts: 'src/auto-imports.d.ts',
        vueTemplate: true,
      }),
      Components({
        dirs: ['src/components'],
        dts: 'src/components.d.ts',
      }),

      // Module Federation: this app is a REMOTE that EXPOSES modules
      federation({
        name: 'shellA',
        filename: 'remoteEntry.js',
        // Plain-JS project: skip federated .d.ts generation (needs a tsconfig)
        dts: false,
        exposes: {
          // host: import('shellA/App')
          './App': './src/App.vue',
        },
        // Same rule as the host: only vue is shared. axios + vuex are bundled
        // privately so this remote owns its instances.
        shared: {
          vue: { singleton: true, requiredVersion: '^3.5.0' },
        },
        // Inject this remote's CSS when the exposed module is loaded by the host
        bundleAllCSS: true,
      }),
    ],

    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },

    css: {
      preprocessorOptions: {
        scss: { additionalData: `@use "@/styles/tokens" as *;\n` },
      },
    },

    server: {
      port,
      strictPort: true,
      // Absolute URLs for dev assets so they load correctly inside the host (port 5000)
      origin: publicUrl.replace(/\/$/, ''),
      cors: true,
    },
    preview: {
      port,
      strictPort: true,
      cors: true,
    },

    build: {
      target: 'esnext',
    },
  }
})
