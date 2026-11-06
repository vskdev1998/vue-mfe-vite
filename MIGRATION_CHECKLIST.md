# Vite 7 migration kit for Vue 3: packages, versions & how to use this repo

Online version of all docs: [Vue MFE Vite Docs](https://claude.ai/artifact/UMcJnDL2Fnh5415m2mpLmt).

Use this repo as the **reference implementation** when you move a Vue 3 project (Vue CLI,
webpack 5, webpack Module Federation) to **Vite 7**. This page tells you:

1. [How to use this repo as a reference](#1-how-to-use-this-repo-as-a-reference)
2. [Prerequisites](#2-prerequisites)
3. [Package checklist with versions](#3-package-checklist-with-versions) (what to install, what to remove)
4. [Version traps](#4-version-traps-read-before-npm-install)
5. [Copy-paste install commands and `package.json`](#5-copy-paste-install-commands)
6. [Step-by-step migration checklist](#6-step-by-step-migration-checklist)
7. [Verify the migration](#7-verify-the-migration)

Versions below were checked against the npm registry on **2026-11-06** and are the ones this
repo runs with (`npm ls` output). "Vite 7 OK" means the package's `peerDependencies.vite`
includes `^7.0.0`.

---

## 1. How to use this repo as a reference

| You want to… | Read | Copy from this repo |
| --- | --- | --- |
| Understand the target setup | [README](README.md), [Architecture](ARCHITECTURE.md) | – |
| Move one app from webpack/Vue CLI to Vite 7 | [webpack → Vite migration](WEBPACK_TO_VITE_MIGRATION.md) | `apps/shell-a/vite.config.mjs`, `index.html`, `config/env.mjs` |
| Learn what changed in Vite 7 | [Vite 7 guide](VITE7_GUIDE.md) | – |
| Drive `vite.config.mjs` from `.env.[mode]` | [vite.config.mjs + env](VITE_CONFIG.md), [Environments](ENVIRONMENTS.md) | `config/env.mjs`, `.env*` files, `scripts/check-env.mjs` |
| Move webpack Module Federation to Vite | [Module Federation](MODULE_FEDERATION.md) §2–§4 | `shared.federation.json`, `config/federation.mjs`, `src/expose/App.mjs` |
| Share a UI library between apps | [ui-dev UI library](UI_DEV_LIBRARY.md) | `apps/host/src/ui-dev/` + the `UiDevResolver` |
| Pick package versions | this page, §3 | root and `apps/*/package.json` |
| Fix a runtime error | [Module Federation](MODULE_FEDERATION.md) §7–§8 | – |

**Recommended order for a real project**

1. Run this repo locally (`npm install && npm run dev`, sign in with `demo / demo123`) so you
   have a working baseline to compare against.
2. Tick off §2 and §3 for your project (Node version, packages).
3. Migrate **one remote** first, following §6. Keep the webpack host running and point it at
   the Vite remote with `varFilename` (see Module Federation §6.9) until the host moves too.
4. Migrate the remaining remotes, then the host.
5. Run §7 for every environment (`development`, `localprod`, `staging`, `production`).

---

## 2. Prerequisites

- [ ] **Node.js `^20.19.0 || >=22.12.0`** (Vite 7 `engines`; Node 18 is no longer supported).
      This repo pins **22** in `.nvmrc`.
- [ ] **npm 10+** (workspaces). pnpm 9+ / yarn 4 work too.
- [ ] `"type": "module"` in every `package.json` (configs are ESM `.mjs`).
- [ ] Browsers: Vite 7's default `build.target` is `'baseline-widely-available'`
      (Chrome/Edge 107, Firefox 104, Safari 16). Federated apps here use `esnext`.
      Older browsers need `@vitejs/plugin-legacy` (see §3.6).

---

## 3. Package checklist with versions

### 3.1 Core (required)

| ✓ | Package | Version in this repo | Range to use | Vite 7 OK | Where | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | `vite` | 7.3.7 | `^7.3.0` | – | devDependencies | **Pin `^7`**. `latest` on npm is 8.x. |
| [ ] | `@vitejs/plugin-vue` | 6.0.10 | `^6.0.0` | ✅ (`^5 – ^8`) | devDependencies | Replaces `vue-loader`. |
| [ ] | `vue` | 3.5.45 | `^3.5.0` | – | dependencies | 3.5+ for `useTemplateRef`, `useId`, reactive props destructure. |
| [ ] | `@vue/compiler-sfc` | 3.5.45 | (don't install) | – | – | Comes with `vue`. Remove an explicit old version. |

### 3.2 Routing & state

| ✓ | Package | Version in this repo | Range to use | Notes |
| --- | --- | --- | --- | --- |
| [ ] | `vue-router` | 4.6.4 | `^4.5.0` | `latest` is 5.x (a new major): migrate the bundler first, the router later. |
| [ ] | `vuex` | 4.1.0 | `^4.1.0` | Final major. Fine to keep during the migration. |
| [ ] | `pinia` (optional) | – | `^3.0.0` | Successor to Vuex (peer `vue ^3.5.11`). Move to it after the Vite migration, not during. |

### 3.3 Styling

| ✓ | Package | Version in this repo | Range to use | Notes |
| --- | --- | --- | --- | --- |
| [ ] | `sass` | 1.108.0 | `^1.93.0` | Vite 7 uses the **modern** Sass API only. Or `sass-embedded` (same version, faster). |
| [ ] | `postcss` | 8.5.x | (don't install) | Comes with Vite. Add a `postcss.config.mjs` only if you need plugins. |
| [ ] | `autoprefixer` (optional) | – | `^10.4.0` | Only if you target old browsers. |
| [ ] | ~~`sass-loader`, `css-loader`, `style-loader`, `vue-style-loader`, `mini-css-extract-plugin`~~ | – | **remove** | Vite handles CSS natively. |

### 3.4 Developer experience

| ✓ | Package | Version in this repo | Range to use | Vite 7 OK | Notes |
| --- | --- | --- | --- | --- | --- |
| [ ] | `unplugin-auto-import` | 21.1.0 | `^21.0.0` | ✅ | `ref`, `computed`, router/vuex hooks, own composables, `_` (lodash). |
| [ ] | `unplugin-vue-components` | 32.1.0 | `^32.0.0` | ✅ | Auto-registers components + `Ui*` resolver for `host/ui-dev`. |
| [ ] | `vite-plugin-vue-devtools` (optional) | – | `^8.0.0` | ✅ (`^6 – ^8`) | Vue DevTools as a Vite plugin. |
| [ ] | `vite-plugin-checker` (optional) | – | `^0.14.0` | ✅ (`>=5.4.21`) | ESLint / vue-tsc errors in the browser overlay. |
| [ ] | `vite-plugin-eslint2` (optional) | – | `^5.0.0` | ✅ | Replaces `eslint-webpack-plugin`. |

### 3.5 Micro-frontends (Module Federation)

| ✓ | Package | Version in this repo | Range to use | Notes |
| --- | --- | --- | --- | --- |
| [ ] | `@module-federation/vite` | 1.23.10 | `^1.23.0` | MF 2.0 runtime; works in **dev and build**. Replaces `webpack.container.ModuleFederationPlugin`. |
| [ ] | `@module-federation/runtime` | 2.9.3 | same as the plugin pulls in | Only add it explicitly if you call `registerRemotes` / `loadRemote` yourself (MF §4.5). |
| [ ] | ~~`@originjs/vite-plugin-federation`~~ | – | **don't use** | Older plugin, no dev-mode remotes, incompatible runtime. |

### 3.6 Optional Vite plugins (compatibility checked)

| ✓ | Package | Range to use with Vite 7 | Replaces (webpack) |
| --- | --- | --- | --- |
| [ ] | `@vitejs/plugin-vue-jsx` | `^5.0.0` | `@vue/babel-plugin-jsx` in babel |
| [ ] | `@vitejs/plugin-legacy` | **`^7.0.0`** (8.x needs Vite 8) | `@babel/preset-env` + `core-js` targets |
| [ ] | `vite-plugin-pwa` | `^1.0.0 \|\| ^2.0.0` | `workbox-webpack-plugin` |
| [ ] | `@intlify/unplugin-vue-i18n` | `^11.0.0` | `@intlify/vue-i18n-loader` |
| [ ] | `vite-svg-loader` | `^5.0.0` | `vue-svg-loader` |
| [ ] | `unplugin-icons` | `^24.0.0` | icon font loaders |
| [ ] | `vite-plugin-node-polyfills` | `^0.28.0` | webpack 4's automatic Node polyfills (`buffer`, `process`) |
| [ ] | (built in) `import.meta.glob` | – | `require.context` |
| [ ] | (built in) `public/` + `?url`, `?raw`, `?worker` | – | `copy-webpack-plugin`, `raw-loader`, `worker-loader`, `file-loader`, `url-loader` |
| [ ] | (built in) `.env.[mode]` + `loadEnv` | – | `dotenv-webpack`, `DefinePlugin` for env |

### 3.7 HTTP & utilities (used in this repo)

| ✓ | Package | Version in this repo | Range to use | Notes |
| --- | --- | --- | --- | --- |
| [ ] | `axios` | 1.21.0 | `^1.13.0` | **One instance per app**, never in federation `shared`. |
| [ ] | `lodash-es` | 4.18.1 | `^4.17.21` | ESM build of lodash (tree-shakeable with named imports). Auto-imported as `_`. Replace `lodash` (CJS). |

### 3.8 Testing

| ✓ | Package | Range to use | Vite 7 OK | Replaces |
| --- | --- | --- | --- | --- |
| [ ] | `vitest` | `^4.0.0` (or `^5.0.0`) | ✅ (`^6/^7/^8`) | `jest`, `vue-jest`, `babel-jest` |
| [ ] | `@vitest/coverage-v8` | same major as `vitest` | ✅ | `jest --coverage` |
| [ ] | `@vue/test-utils` | `^2.4.0` | – | (same) |
| [ ] | `jsdom` or `happy-dom` | latest | – | `jest-environment-jsdom` |
| [ ] | `@playwright/test` (e2e) | latest | – | `@vue/cli-plugin-e2e-*`, Nightwatch |

### 3.9 Lint & tooling

| ✓ | Package | Range to use | Notes |
| --- | --- | --- | --- |
| [ ] | `eslint` | `^9.0.0` or `^10.0.0` | Flat config (`eslint.config.mjs`). |
| [ ] | `eslint-plugin-vue` | `^10.0.0` | `pluginVue.configs['flat/recommended']`. |
| [ ] | `concurrently` | `^9.2.0` | Runs all apps with one `npm run dev` (root). |
| [ ] | `marked` | `^18.0.0` | Only for this repo's docs generator. |

### 3.10 Remove (webpack / Vue CLI)

| ✓ | Remove | Vite replacement |
| --- | --- | --- |
| [ ] | `@vue/cli-service`, `@vue/cli-plugin-*` | `vite` + `@vitejs/plugin-vue` |
| [ ] | `webpack`, `webpack-cli`, `webpack-dev-server`, `webpack-merge` | `vite`, `defineConfig(({ mode }) => …)` |
| [ ] | `vue-loader`, `vue-template-compiler` | `@vitejs/plugin-vue` |
| [ ] | `babel-loader`, `@babel/core`, `@babel/preset-env`, `core-js` | esbuild (built in); `@vitejs/plugin-legacy` if needed |
| [ ] | `html-webpack-plugin` | root `index.html` (+ `%VITE_*%` placeholders) |
| [ ] | `css-loader`, `sass-loader`, `style-loader`, `vue-style-loader`, `mini-css-extract-plugin`, `postcss-loader` | built-in CSS + `sass` |
| [ ] | `file-loader`, `url-loader`, `raw-loader`, `svg-inline-loader` | built-in assets, `?url` / `?raw`, `vite-svg-loader` |
| [ ] | `copy-webpack-plugin` | `public/` folder |
| [ ] | `dotenv-webpack`, `DefinePlugin` (for env) | `.env.[mode]` + `import.meta.env` |
| [ ] | `terser-webpack-plugin` | esbuild minifier (`esbuild.drop`, `esbuild.pure`) |
| [ ] | `fork-ts-checker-webpack-plugin` | `vite-plugin-checker` |
| [ ] | `jest`, `vue-jest`, `babel-jest` | `vitest` |
| [ ] | `lodash` (CJS) | `lodash-es` |

---

## 4. Version traps (read before `npm install`)

| Trap | What happens | Do this |
| --- | --- | --- |
| `npm i -D vite` without a range | Installs **Vite 8** (current `latest`) | `npm i -D vite@^7` |
| `@vitejs/plugin-legacy@latest` | 8.x has `peer vite ^8` → peer-dependency error with Vite 7 | `@vitejs/plugin-legacy@^7` |
| `vue-router@latest` | Installs 5.x, a new major | Keep `^4.5` until the Vite migration is done |
| Node 18 | `vite` refuses to start (engines `^20.19.0 \|\| >=22.12.0`) | `nvm use 22` (`.nvmrc`) |
| `sass` < 1.79 / legacy API options (`sassOptions`, `api: 'legacy'`) | Vite 7 removed the legacy Sass API | `sass@^1.93`, `css.preprocessorOptions.scss` (modern) |
| `@originjs/vite-plugin-federation` mixed with `@module-federation/vite` | Different runtimes, `RUNTIME-*` errors, no dev remotes | Use `@module-federation/vite` in every app |
| Different `@module-federation/vite` versions across apps | Runtime mismatch between host and remotes | Same version in all apps (one lockfile with workspaces) |
| `vue` versions differ between host and remotes | `singleton` warning, or two Vue copies | Same `^3.5.x` everywhere, `requiredVersion: '^3.5.0'` |
| `concurrently@latest` | 10.x major, check its changelog | This repo uses `^9.2` |

---

## 5. Copy-paste install commands

```bash
# 0. Node
nvm install 22 && nvm use 22

# 1. remove webpack / Vue CLI tooling
npm rm @vue/cli-service @vue/cli-plugin-babel @vue/cli-plugin-router @vue/cli-plugin-vuex \
  @vue/cli-plugin-eslint webpack webpack-cli webpack-dev-server webpack-merge \
  vue-loader vue-template-compiler vue-style-loader css-loader sass-loader style-loader \
  postcss-loader mini-css-extract-plugin html-webpack-plugin copy-webpack-plugin \
  babel-loader @babel/core dotenv-webpack terser-webpack-plugin

# 2. runtime dependencies (per app)
npm i vue@^3.5.0 vue-router@^4.5.0 vuex@^4.1.0 axios@^1.13.0 lodash-es@^4.17.21

# 3. build tooling (per app)
npm i -D vite@^7.3.0 @vitejs/plugin-vue@^6.0.0 sass@^1.93.0 \
  unplugin-auto-import@^21.0.0 unplugin-vue-components@^32.0.0 \
  @module-federation/vite@^1.23.0

# 4. root of the monorepo
npm i -D concurrently@^9.2.0

# 5. tests (optional)
npm i -D vitest@^4.0.0 @vitest/coverage-v8@^4.0.0 @vue/test-utils@^2.4.0 jsdom
```

In this repo (npm workspaces) step 2–3 run once per app with `-w apps/<name>`:

```bash
npm i lodash-es@^4.17.21 -w apps/host -w apps/shell-a -w apps/shell-b
```

### Reference `package.json` (one app)

```json
{
  "name": "@mfe/shell-a",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:staging": "vite build --mode staging",
    "build:localprod": "vite build --mode localprod",
    "preview": "vite preview --mode localprod"
  },
  "dependencies": {
    "axios": "^1.13.0",
    "lodash-es": "^4.17.21",
    "vue": "^3.5.0",
    "vuex": "^4.1.0"
  },
  "devDependencies": {
    "@module-federation/vite": "^1.23.0",
    "@vitejs/plugin-vue": "^6.0.0",
    "sass": "^1.93.0",
    "unplugin-auto-import": "^21.0.0",
    "unplugin-vue-components": "^32.0.0",
    "vite": "^7.3.0"
  }
}
```

The host adds `"vue-router": "^4.5.0"`. The root `package.json` has `"workspaces": ["apps/*"]`,
`concurrently`, and the `dev` / `build` / `check:env` / `docs:build` scripts.

---

## 6. Step-by-step migration checklist

Tick these per app. Each item names the file in this repo to copy or compare with.

### Phase 1: tooling

- [ ] Node 20.19+ / 22.12+, `.nvmrc` → [`.nvmrc`](.nvmrc)
- [ ] Packages from §3 installed, §3.10 removed, `"type": "module"` set
- [ ] Scripts: `vite`, `vite build`, `vite build --mode staging`, `vite preview --mode localprod`
- [ ] `vite.config.mjs` created → `apps/<app>/vite.config.mjs`
- [ ] `@` alias (`resolve.alias`) + `jsconfig.json` for editors → `apps/<app>/jsconfig.json`

### Phase 2: HTML, env, assets

- [ ] `public/index.html` → root `index.html` with `<script type="module" src="/src/main.mjs">`
- [ ] Critical CSS (background, splash) inline in `index.html`
- [ ] `<%= BASE_URL %>` → `/` or `%VITE_*%` placeholders
- [ ] `.env`, `.env.development`, `.env.localprod`, `.env.staging`, `.env.production`, `.env.example`
- [ ] `VUE_APP_*` → `VITE_*`, `process.env.X` → `import.meta.env.X`
- [ ] Config values read through `config/env.mjs` (`loadEnv(mode, root, '')`), validated at start
- [ ] `npm run check:env` passes → [`scripts/check-env.mjs`](scripts/check-env.mjs)
- [ ] `require('./img.png')` → `import img from './img.png'` or `new URL('./img.png', import.meta.url)`
- [ ] `require.context` → `import.meta.glob`

### Phase 3: source code

- [ ] All `.vue` imports include the extension (`import X from './X.vue'`)
- [ ] No `require()` / `module.exports` left in `src/`
- [ ] Sass: `~pkg/…` → `pkg/…`, `/deep/` and `>>>` → `:deep()`, `@import` → `@use` where possible,
      `map-get` → `sass:map` `map.get`
- [ ] Global Sass tokens injected with `css.preprocessorOptions.scss.additionalData`
- [ ] Auto-imports configured (`unplugin-auto-import`, `unplugin-vue-components`), including
      `.mjs` in `include` and lodash as `_`
- [ ] `lodash` → `lodash-es` (`_` in `<script>` only, not in `<template>`)
- [ ] axios: one instance per app (`src/services/http.mjs`) with its own base URL and gateway key
- [ ] Vuex: one store per app under its own injection key (`src/store`, `src/composables`)

### Phase 4: Module Federation

- [ ] `ModuleFederationPlugin` → `federation()` from `@module-federation/vite`
- [ ] Remotes: contract in `shared.federation.json` + `config/federation.mjs`
- [ ] Remote URLs from `.env.[mode]` (`VITE_*_ENTRY`), never hard-coded
- [ ] `type: 'module'` for Vite remotes, `type: 'var'` for remaining webpack remotes
- [ ] `shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } }`; axios / vuex / lodash **not** shared
- [ ] `shareStrategy: 'loaded-first'`, `bundleAllCSS: true`, `dts: false` (JS project)
- [ ] webpack `bootstrap.js` async boundary removed (`main.mjs` imports directly)
- [ ] Remote exposes an async entry that awaits shared libraries (`src/expose/App.mjs`)
- [ ] Absolute `base` for builds (`VITE_PUBLIC_URL`), `server.origin` for dev, `build.target: 'esnext'`
- [ ] CORS (`VITE_CORS_ORIGINS`) and `allowedHosts` (`VITE_ALLOWED_HOSTS`) set per mode
- [ ] Fixed ports with `strictPort: true` (avoid macOS AirPlay on 5000)

### Phase 5: tests, CI, deploy

- [ ] `jest` → `vitest` (`vi` instead of `jest` globals)
- [ ] CI uses Node 22, runs `npm ci`, `npm run check:env`, `npm run build`
- [ ] Deploy uploads `dist/` (including `remoteEntry.js`) per app; remotes deployed **before** the host
- [ ] Cache headers: `remoteEntry.js` short / no-cache, hashed `assets/*` long-term

---

## 7. Verify the migration

```bash
npm run check:env          # every app × mode: required keys, URLs, gateway keys
npm run dev                # host :8080, shell-a :8081, shell-b :8082
npm run build              # remotes first, then host
npm run preview            # vite preview --mode localprod for all apps
npm ls vite vue @module-federation/vite   # one version of each across the workspace
```

- [ ] Host loads both remotes in dev **and** preview (Network tab: `remoteEntry.js` 200 from each origin)
- [ ] Each remote runs standalone (`http://localhost:8081`, `:8082`) with `host/ui-dev` components styled
- [ ] Only one Vue on the page: `__FEDERATION__.__SHARE__` shows a single `vue` version loaded
- [ ] No `RUNTIME-*` errors in the console (see [Module Federation](MODULE_FEDERATION.md) §7)
- [ ] Every request carries the app's own `x-api-gateway-key`
- [ ] Bundle sizes compared with the webpack build (`dist/assets`)
