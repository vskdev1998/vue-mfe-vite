# Migrating from webpack (Vue CLI / webpack 5 Module Federation) to Vite 7

This guide takes a typical **Vue CLI or hand-rolled webpack 5** Vue 3 micro-frontend setup
and moves it to the structure used in this repo. Each step maps a webpack concept to its
Vite equivalent, with the real file from this repo as the target.

## 0. Strategy

Migrate **one app at a time, remotes first or host first**, never big-bang. With Module
Federation 2.0 a Vite host can consume webpack remotes and vice versa (see step 9), so the
system keeps working while apps move over.

Recommended order:

1. Upgrade the webpack app to Vue 3.5 and Node 22 first (no build changes).
2. Migrate one **leaf remote** (fewest dependents) to Vite.
3. Migrate the remaining remotes.
4. Migrate the host last.

## 1. Dependencies

```bash
# remove
npm rm @vue/cli-service @vue/cli-plugin-babel @vue/cli-plugin-router @vue/cli-plugin-vuex \
  webpack webpack-cli webpack-dev-server vue-loader vue-style-loader css-loader sass-loader \
  style-loader html-webpack-plugin mini-css-extract-plugin babel-loader @babel/core \
  copy-webpack-plugin dotenv-webpack

# add
npm i -D vite@^7 @vitejs/plugin-vue@^6 sass @module-federation/vite \
  unplugin-auto-import unplugin-vue-components
```

`package.json` scripts:

| webpack / Vue CLI | Vite |
| --- | --- |
| `vue-cli-service serve` / `webpack serve` | `vite` |
| `vue-cli-service build` / `webpack --mode production` | `vite build` |
| `vue-cli-service build --mode staging` | `vite build --mode staging` |
| (none) | `vite preview` |

Add `"type": "module"` to `package.json` so `vite.config.mjs` can use ESM.

## 2. `index.html` moves to the project root

| webpack | Vite |
| --- | --- |
| `public/index.html` + `HtmlWebpackPlugin` | `index.html` at app root |
| `<%= htmlWebpackPlugin.options.title %>` | `%VITE_APP_TITLE%` |
| `<%= BASE_URL %>favicon.ico` | `/favicon.ico` |
| bundle injected automatically | add `<script type="module" src="/src/main.mjs"></script>` yourself |

Inline critical CSS can stay in `<style>` inside `index.html` (see `apps/host/index.html`).

## 3. Config: `vue.config.js` / `webpack.config.js` → `vite.config.mjs`

| webpack | Vite (`vite.config.mjs`) |
| --- | --- |
| `entry: './src/main.mjs'` | from `index.html` |
| `output.publicPath` / `publicPath` | `base` |
| `output.path` / `outputDir` | `build.outDir` (default `dist`) |
| `resolve.alias['@']` | `resolve.alias['@']` (Vue CLI added it implicitly, Vite does not) |
| `resolve.extensions` incl. `.vue` | Always write `.vue` in imports |
| `module.rules` vue-loader | `@vitejs/plugin-vue` |
| `module.rules` babel-loader | not needed (esbuild for TS/JSX, modern targets) |
| `module.rules` sass/css/style-loader | built in: just install `sass` |
| `css.loaderOptions.sass.additionalData` | `css.preprocessorOptions.scss.additionalData` |
| `file-loader` / `url-loader` / asset modules | built in; `build.assetsInlineLimit` |
| `DefinePlugin` | `define` |
| `devServer.port` / `proxy` / `headers` | `server.port` / `server.proxy` / `server.headers` |
| `devServer.historyApiFallback` | built in |
| `optimization.splitChunks` | `build.rollupOptions.output.manualChunks` |
| `ModuleFederationPlugin` | `federation()` from `@module-federation/vite` |
| `CopyWebpackPlugin` (public) | `public/` folder |
| `require.context()` | `import.meta.glob()` |

## 4. Environment variables

| webpack / Vue CLI | Vite |
| --- | --- |
| `VUE_APP_API_URL` | `VITE_API_BASE_URL` |
| `process.env.VUE_APP_API_URL` | `import.meta.env.VITE_API_BASE_URL` |
| `process.env.NODE_ENV === 'production'` | `import.meta.env.PROD` |
| `process.env.BASE_URL` | `import.meta.env.BASE_URL` |
| `.env.development`, `.env.production` | same names, same idea |

Quick rename:

```bash
grep -rl "process.env.VUE_APP_" src | xargs sed -i '' 's/process\.env\.VUE_APP_/import.meta.env.VITE_/g'   # macOS
# rename keys in .env* files: VUE_APP_ → VITE_
```

If a library reads `process.env.X` at runtime, add `define: { 'process.env.X': JSON.stringify(value) }`.

## 5. Module syntax

- `require('./x')` → `import x from './x'`; `module.exports` → `export default`.
- `require.context('./modules', false, /\.js$/)` (common for auto-registering Vuex modules):

```js
// webpack
const ctx = require.context('./modules', false, /\.js$/)
const modules = Object.fromEntries(ctx.keys().map((k) => [k.replace(/(\.\/|\.js)/g, ''), ctx(k).default]))

// Vite
const files = import.meta.glob('./modules/*.mjs', { eager: true })
const modules = Object.fromEntries(
  Object.entries(files).map(([path, m]) => [path.match(/\/(\w+)\.mjs$/)[1], m.default]),
)
```

- Dynamic image paths: `require(\`@/assets/${name}.png\`)` → `new URL(\`../assets/${name}.png\`, import.meta.url).href`.

## 6. Sass

- `~` prefix for node_modules imports (`@import '~bootstrap/scss/x'`) → drop it: `@use 'bootstrap/scss/x'`.
- `node-sass` → `sass` (Dart Sass). Vite 7 only supports the modern API.
- Move `@import 'variables'` to `@use 'variables' as *` and inject via `additionalData` (see `apps/*/vite.config.mjs`).
- `/deep/` and `>>>` → `:deep(.child)` in scoped styles.

## 7. Auto-imports instead of global registration

webpack apps often register components globally in `main.mjs` (`app.component('BaseButton', ...)`)
or with `require.context`. Replace with:

```js
Components({ dirs: ['src/components'], dts: 'src/components.d.ts' })
AutoImport({ imports: ['vue', 'vue-router', 'vuex'], dirs: ['src/composables'], dts: 'src/auto-imports.d.ts' })
```

You can keep explicit imports, the plugins only fill in what's missing.

## 8. Vuex and axios in a micro-frontend

These don't change between bundlers, but migrating is a good moment to fix two common
webpack-era MFE problems:

1. **Shared store by accident.** If `vuex` was `shared: { vuex: { singleton: true } }` and
   remotes called `useStore()`, they could get the host's store. Use one store per app with
   its own injection key and `provide` it from the remote root (`apps/shell-a/src/App.vue`).
2. **Global axios defaults.** `axios.defaults.baseURL = ...` in one app leaks into others when
   axios is shared. Use `axios.create()` per app and remove axios from `shared`
   (`apps/*/src/services/http.mjs`).

## 9. Module Federation: webpack → Vite

### Remote

```js
// webpack.config.js
new ModuleFederationPlugin({
  name: 'shellA',
  filename: 'remoteEntry.js',
  exposes: { './App': './src/App.vue' },
  shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } },
})
output: { publicPath: 'http://localhost:8081/' }
```

```js
// vite.config.mjs
federation({
  name: 'shellA',
  filename: 'remoteEntry.js',
  exposes: { './App': './src/App.vue' },
  shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } },
  bundleAllCSS: true,
}),
base: command === 'build' ? env.VITE_PUBLIC_URL : '/',
server: { origin: 'http://localhost:8081', cors: true },
build: { target: 'esnext' },
```

### Host

```js
// webpack
remotes: { shellA: 'shellA@http://localhost:8081/remoteEntry.js' }

// vite
remotes: {
  shellA: { type: 'module', name: 'shellA', entry: 'http://localhost:8081/remoteEntry.js', entryGlobalName: 'shellA' },
}
```

### Bootstrap file

webpack MF needs an async boundary (`main.js` → `import('./bootstrap')`) to avoid
"Shared module is not available for eager consumption". **Delete it** in Vite: the plugin
initialises sharing before your entry runs. Put the code back in `main.mjs`.

### Mixed bundlers during migration

- **Vite host → webpack remote:** declare the remote with `type: 'var'` and its global name.
- **webpack host → Vite remote:** add `varFilename: 'varRemoteEntry.js'` to the Vite remote
  and point the webpack host at that file (`shellA@https://.../varRemoteEntry.js`).
- Keep `shared` versions compatible on both sides.

### Shared UI kit

webpack MFE setups often share a design-system package (`shared: { '@acme/ui': { singleton: true } }`)
or publish it to npm. Here the host **exposes** it instead (`exposes: { './ui-dev': … }`), and
remotes consume `host/ui-dev` through a components resolver. That means no npm release, one
version in production, and themes through CSS variables. See [ui-dev](UI_DEV_LIBRARY.md).

### Moving federation options out of the config (remotes)

Remotes keep their `ModuleFederationPlugin` fields in `shared.federation.json` (`name`,
`exposes`, `remotes`, `shared`). Remote URLs become env key names (`entryEnv`), so one JSON
file works for every environment. See [How vite.config.mjs is built](VITE_CONFIG.md).

## 10. JavaScript only, as `.mjs`

- Rename `vue.config.js` / `webpack.config.js` to `vite.config.mjs`. `.mjs` is always ESM, so
  `import`/`export` work whatever `"type"` says.
- Rename source files to `.mjs` (`main.mjs`, `router/index.mjs`, …) and update
  `<script type="module" src="/src/main.mjs">`. Extension-less imports keep working because
  Vite resolves `.mjs` first.
- Drop TypeScript-only tooling: set `dts: false` for unplugin-auto-import/-components and
  federation, delete generated `.d.ts`, and add a `jsconfig.json` for editor path aliases.
- Replace `process.env` in config code with `loadEnv(mode, root, '')` (see `config/env.mjs`).

## 11. Testing

`jest` + `vue-jest` → **Vitest** (`npm i -D vitest @vue/test-utils jsdom`). It reuses
`vite.config.mjs` (aliases, plugins). Most Jest APIs work with `vi` instead of `jest`.

## 12. Checklist

For package-by-package versions and a phase-by-phase checklist, see the
[Migration kit: packages & versions](MIGRATION_CHECKLIST.md).


- [ ] Node 20.19+ / 22.12+
- [ ] `index.html` at root with `<script type="module" src="/src/main.mjs">`
- [ ] `vite.config.mjs` with `@vitejs/plugin-vue` and the `@` alias
- [ ] Config values come from `.env.[mode]` via `loadEnv` (`config/env.mjs`), nothing hard-coded
- [ ] Remotes: federation contract in `shared.federation.json`
- [ ] Shared UI components consumed from `host/ui-dev`, not bundled per app
- [ ] `VUE_APP_*` → `VITE_*`, `process.env` → `import.meta.env`
- [ ] No `require()` / `require.context()` left
- [ ] All `.vue` imports include the extension
- [ ] `sass` installed, `~` imports removed, `/deep/` → `:deep()`
- [ ] webpack MF `bootstrap.js` async boundary removed
- [ ] Remotes: absolute `base` for builds, `server.origin` for dev
- [ ] axios and vuex not in `shared`; per-app instances
- [ ] `vite build && vite preview` works; host loads every remote
- [ ] CI updated (`dist/` output, new scripts)
