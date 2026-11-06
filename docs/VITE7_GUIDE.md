# Vite 7 guide (with examples from this repo)

Vite 7 was released in June 2025. It is an evolutionary release: the config format is the
same as Vite 5/6, but the platform baseline moved forward. This guide covers what you need
to run, configure and reason about the apps in this repo.

## 1. Requirements and what changed in 7

| Topic | Vite 7 |
| --- | --- |
| Node.js | **20.19+ or 22.12+** (Node 18 dropped). These versions can `require()` ESM, so Vite ships as **ESM only**. |
| Default `build.target` | `'baseline-widely-available'` (Chrome/Edge 107, Firefox 104, Safari 16). Was `'modules'`. |
| Sass | Only the **modern** Sass API is supported. The legacy API (`api: 'legacy'`) was removed. |
| Removed | `splitVendorChunkPlugin`, hook-level `enforce` / `transform` in `transformIndexHtml` (use `order` / `handler`). |
| Environment API | Still experimental; adds a `buildApp` hook for frameworks. Not needed for SPAs. |
| Bundler | Rollup 4 for builds, esbuild for dep pre-bundling. Rolldown is available as the drop-in `rolldown-vite` package (and is the default in Vite 8). |
| Plugin Vue | `@vitejs/plugin-vue@6` supports Vite 5 → 8. |
| Vitest | Use Vitest 3.2+ with Vite 7. |

In this repo every app sets `build.target: 'esnext'`, because the Module Federation runtime
uses top-level `await`.

## 2. How Vite works (vs. a bundler-first dev server)

- **Dev**: Vite serves your source as native ES modules. Only the file the browser asks for
  is transformed (`.vue` → JS, `.scss` → CSS). Dependencies in `node_modules` are
  pre-bundled once with esbuild into `node_modules/.vite`. Start-up time doesn't grow with
  app size, and HMR only touches the edited module.
- **Build**: Rollup bundles, tree-shakes, code-splits and hashes for production.

## 3. Project anatomy

```
apps/host/
├─ index.html        ← the real entry (not in /public). Vite parses it and follows <script type="module">
├─ public/           ← copied as-is, served at /  (favicon.svg)
├─ vite.config.js
├─ .env*             ← env files
└─ src/main.js
```

`index.html` supports env replacement: `<title>%VITE_APP_TITLE%</title>`.

## 4. The config, line by line (`apps/host/vite.config.js`)

```js
export default defineConfig(({ command, mode }) => {   // function form gives command/mode
  const env = loadEnv(mode, process.cwd(), '')          // '' = load ALL vars, not only VITE_*
  return {
    plugins: [vue(), AutoImport({...}), Components({...}), federation({...})],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    css: { preprocessorOptions: { scss: { additionalData: `@use "@/styles/tokens" as *;\n` } } },
    server:  { port, strictPort: true },
    preview: { port, strictPort: true },
    build:   { target: 'esnext' },
  }
})
```

- `command` is `'serve'` or `'build'`; remotes use it to set `base` only for builds.
- `mode` is `development` for `vite`, `production` for `vite build`, or whatever `--mode` says.

## 5. Environment variables

- `import.meta.env.VITE_*` in client code; `MODE`, `DEV`, `PROD`, `BASE_URL`, `SSR` are built in.
- Files: `.env`, `.env.local`, `.env.[mode]`, `.env.[mode].local`. See [ENVIRONMENTS.md](ENVIRONMENTS.md).
- `process.env` does **not** exist in browser code. Replace `process.env.VUE_APP_X` with `import.meta.env.VITE_X`.

## 6. CSS and Sass

- Install `sass` (or `sass-embedded`, faster) and use `<style lang="scss">`. No loader config.
- Vite 7 uses the modern compiler API: use `@use` / `@forward`, `sass:map`, `sass:color`.
  `@import` and global functions like `map-get` still compile but print deprecation warnings.
- `additionalData` prepends code to every Sass file. Put only variables, mixins and
  functions there, never real CSS rules, or they get duplicated per component.
- CSS Modules: name files `*.module.scss`. PostCSS: add `postcss.config.js`, it's picked up automatically.
- Inline `<style>` in `index.html` is left as-is: ideal for critical CSS (see each app's `index.html`).

## 7. Static assets

- `import logo from './logo.png'` gives a hashed URL. `?raw`, `?url`, `?inline`, `?worker` suffixes are available.
- Files in `public/` are referenced by absolute path (`/favicon.svg`) and not hashed.
- `new URL('./img.png', import.meta.url).href` works for dynamic paths.

## 8. Auto import (unplugin)

```js
AutoImport({
  imports: ['vue', 'vue-router', 'vuex'],   // ref, computed, useRoute, useStore…
  dirs: ['src/composables', 'src/utils'],   // your own exports become globals too
  dts: 'src/auto-imports.d.ts',             // editor IntelliSense (generated)
  vueTemplate: true,                        // also usable inside <template>
})
Components({ dirs: ['src/components'], dts: 'src/components.d.ts' })
```

`auto-imports.d.ts` and `components.d.ts` are generated on the first `dev`/`build`.
Keep entry files (`main.js`) explicit: it makes bootstrap code readable.

## 9. Code splitting

- `() => import('./View.vue')` in routes creates a separate chunk.
- `build.rollupOptions.output.manualChunks` replaces the removed `splitVendorChunkPlugin` if you need vendor chunks.

## 10. Dev server and preview

- `server.port`, `server.strictPort`, `server.proxy` (replace webpack-dev-server proxy),
  `server.origin` (absolute asset URLs; the remotes use it so the host can load their dev modules),
  `server.cors` (Vite 6+ restricts CORS to localhost origins by default; remotes enable it explicitly).
- `vite preview` serves `dist/` for a local production check. It is not a production server.

## 11. Module Federation in Vite 7

See [ARCHITECTURE.md](ARCHITECTURE.md#1-module-federation). Key points:

- `@module-federation/vite` supports Vite 5 through 8, dev + build.
- Remotes need an absolute `base` in production (`VITE_PUBLIC_URL`) and `server.origin` in dev.
- Use `type: 'module'` for Vite remotes. Use `type: 'var'` only for webpack/rspack remotes.
- `bundleAllCSS: true` makes a remote's CSS load with its exposed module.

## 12. Upgrading an existing Vite 5/6 app to 7

1. Upgrade Node to 22 LTS (or 20.19+).
2. `npm i -D vite@^7 @vitejs/plugin-vue@^6`.
3. Remove `css.preprocessorOptions.scss.api: 'legacy'` if present and fix Sass deprecations.
4. Remove `splitVendorChunkPlugin` (use `manualChunks`).
5. If you must support older browsers than Safari 16 / Chrome 107, set `build.target` explicitly
   or use `@vitejs/plugin-legacy`.
6. Check plugins declare `vite@^7` in peer dependencies.
