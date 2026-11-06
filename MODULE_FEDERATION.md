# Module Federation: complete developer guide

Everything you need to set up, configure, extend and debug Module Federation in this repo:
concepts, a from-scratch setup, **every plugin option**, **every config method with its complete shape and when to use it**, copy-paste snippets, and a fix for
**every runtime / build error code**.

Versions used here: `@module-federation/vite` 1.23, Module Federation runtime 2.x
(`@module-federation/runtime-core`), Vite 7, Vue 3.5.

---

## 1. Concepts in 2 minutes

| Term | Meaning | In this repo |
| --- | --- | --- |
| **Container** | A build that takes part in federation. Every app is one. | `host`, `shellA`, `shellB` |
| **Remote** | A container that **exposes** modules to others. | shell-a, shell-b (expose `./App`), host (exposes `./ui-dev`) |
| **Host / consumer** | A container that **loads** modules from remotes. | host (loads `shellA/App`, `shellB/App`), remotes (load `host/ui-dev`) |
| **remoteEntry.js** | A remote's small manifest + bootstrap file. Hosts fetch it first. | `http://localhost:500x/remoteEntry.js` |
| **Expose** | A public module path → a file. Imported as `<remote>/<path>`. | `'./App' → ./src/expose/App.mjs` |
| **Share scope** | A runtime registry of shared packages (default name `default`). | `vue` lives there |
| **Shared dependency** | A package that every container agrees to load **once**. | `vue` (singleton) |
| **Share strategy** | How versions are negotiated: `version-first` (fetch all remotes first) or `loaded-first` (use what's already loaded). | `loaded-first` |

A container can be host **and** remote at the same time. Here federation goes both ways:

```
host ──imports──► shellA/App ──imports──► host/ui-dev
     ──imports──► shellB/App ──imports──► host/ui-dev
```

### What happens at runtime (host page)

1. The browser loads the host's `index.html`. The plugin injects a **host init** script that
   creates the federation runtime instance and registers `shellA`, `shellB` and the shared `vue`.
2. The user opens `/shell-a`. `ShellAView` calls `import('shellA/App')`.
3. The runtime fetches `VITE_SHELL_A_ENTRY` (`remoteEntry.js`), calls its `init()` with the share
   scope (so shell-a reuses the host's `vue`), then `get('./App')`.
4. `./App` is `src/expose/App.mjs`. It awaits `host/ui-dev` (the runtime fetches the host's own
   `remoteEntry.js`, which is cached), then returns `App.vue`.
5. Vue renders `<App :user>` inside the host's app instance. Shell-a's CSS is injected
   (`bundleAllCSS`).

---

## 2. Setup from scratch

### 2.1 Install

```bash
npm i -D @module-federation/vite vite@^7 @vitejs/plugin-vue
npm i vue
```

### 2.2 A remote (expose a component)

```js
// apps/shell-a/vite.config.mjs (simplified)
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { federation } from '@module-federation/vite'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? 'http://localhost:8081/' : '/', // absolute in production!
  plugins: [
    vue(),
    federation({
      name: 'shellA',
      filename: 'remoteEntry.js',
      exposes: { './App': './src/expose/App.mjs' },
      shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } },
      bundleAllCSS: true,
      dts: false,
    }),
  ],
  server: { port: 8081, strictPort: true, origin: 'http://localhost:8081', cors: true },
  preview: { port: 8081, strictPort: true, cors: true },
  build: { target: 'esnext' }, // runtime uses top-level await
}))
```

In this repo the `federation({...})` options come from `apps/shell-a/shared.federation.json`
(see [VITE_CONFIG.md](VITE_CONFIG.md)).

### 2.3 A host (consume it)

```js
// apps/host/vite.config.mjs (simplified)
federation({
  name: 'host',
  remotes: {
    shellA: {
      type: 'module',                 // Vite remotes are ESM
      name: 'shellA',                 // must equal the remote's `name`
      entry: 'http://localhost:8081/remoteEntry.js',
      entryGlobalName: 'shellA',
      shareScope: 'default',
    },
  },
  shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } },
  shareStrategy: 'loaded-first',
  dts: false,
})
```

```vue
<!-- apps/host/src/views/ShellAView.vue -->
<script setup>
const ShellA = defineRemoteComponent(() => import('shellA/App'), 'Shell A (catalog)')
</script>
<template><ShellA :user="user" /></template>
```

### 2.4 Make the host a remote too (shared UI library)

```js
// host
federation({
  name: 'host',
  exposes: { './ui-dev': './src/ui-dev/index.mjs' },
  bundleAllCSS: true,
  shareStrategy: 'loaded-first',
  // remotes, shared …
})
```

```json
// remote: shared.federation.json
"remotes": { "host": { "type": "module", "entryEnv": "VITE_HOST_ENTRY" } }
```

```js
// remote: vite.config.mjs → <UiButton> becomes import { UiButton } from 'host/ui-dev'
Components({ resolvers: [(n) => (/^Ui[A-Z]/.test(n) ? { name: n, from: 'host/ui-dev' } : undefined)] })
```

### 2.5 Checklist for a new remote

1. Pick a unique `name` (valid JS identifier: `shellC`, not `shell-c`).
2. `filename: 'remoteEntry.js'`, `exposes`, `shared: { vue: { singleton: true } }`.
3. Absolute `base` for builds (`VITE_PUBLIC_URL`) and `server.origin` for dev.
4. CORS: allow the host origin (`VITE_CORS_ORIGINS`).
5. `build.target: 'esnext'`.
6. In the host: add the remote with `type: 'module'`, add its URL to every `.env.[mode]`.
7. Add the remote's origin to the host's `VITE_CORS_ORIGINS` if it uses `host/ui-dev`.

---

## 3. Plugin options reference (`federation({...})`)

| Option | Type | Default | What it does | This repo |
| --- | --- | --- | --- | --- |
| `name` | `string` | (required) | Container name. Unique per page, valid identifier. Hosts reference remotes by it. | `host`, `shellA`, `shellB` |
| `filename` | `string` | `'remoteEntry.js'` | File name of the remote entry emitted at the build root. | `remoteEntry.js` |
| `exposes` | `Record<string, string \| { import }>` | `{}` | Public paths → source files. Keys start with `./`. | `./App`, `./ui-dev` |
| `remotes` | `Record<string, string \| RemoteObject>` | `{}` | Remotes this container consumes. Prefer the object form. | host: `shellA`, `shellB`; remotes: `host` |
| `shared` | `string[] \| Record<string, string \| SharedConfig>` | `{}` | Packages loaded once and shared. | `vue` |
| `shareScope` | `string \| string[]` | `'default'` | Default share scope name for this container. | default |
| `shareStrategy` | `'version-first' \| 'loaded-first'` | `'version-first'` | `version-first` fetches every remote entry at startup to pick the best version. `loaded-first` reuses what's loaded and fetches remotes lazily. | `loaded-first` |
| `bundleAllCSS` | `boolean` | `false` | Adds **all** CSS of the build to every exposed module, so the consumer gets your styles. | `true` everywhere |
| `publicPath` | `string` | Vite `base` (or `auto`) | Override the public path used for remote chunks. | not set (we use `base`) |
| `getPublicPath` | `string` | – | JS expression evaluated at runtime to compute the public path (e.g. from `window`). | – |
| `varFilename` | `string` | – | Also emit a `var`-format entry for **webpack/rspack hosts**. | – |
| `manifest` | `boolean \| { fileName, filePath, disableAssetsAnalyze, additionalData }` | `false` | Emit `mf-manifest.json` + `mf-stats.json` (lets hosts load a remote by manifest URL, enables preloading). | – |
| `dts` | `boolean \| object` | on | Generate/consume federated TypeScript types. Needs a `tsconfig.json`. | `false` (no TS) |
| `dev` | `boolean \| { disableLiveReload, disableHotTypesReload, … }` | on | Dev-time helpers (live reload, hot types). | default |
| `runtimePlugins` | `Array<string \| [string, options]>` | `[]` | Paths to runtime plugins (hooks around loading, see §6.4 and §4.6). | – |
| `hostInitInjectLocation` | `'html' \| 'entry'` | `'html'` | Where the host init script is injected. Use `'entry'` for apps without `index.html` (SSR). | default |
| `moduleParseTimeout` | `number` (s) | `10` | Max time to parse modules during build. | default |
| `moduleParseIdleTimeout` | `number` (s) | – | Idle timeout (resets on activity). Better for big builds. | – |
| `virtualModuleDir` | `string` | `'__mf__virtual'` | Folder for generated virtual modules. | default |
| `ignoreOrigin` | `boolean` | `false` | Don't rewrite asset origins. | – |
| `target` | `'web' \| 'node'` | `'web'` | Build target for tree shaking. | – |
| `disableRemote` / `disableShared` / `disableSnapshot` | `boolean` | `false` | Strip unused runtime features to save bytes. Only when you're sure. | – |
| `ssrFilename`, `ssrExternals`, `ssrEntryLoader` | – | – | SSR builds only. | – |
| `library`, `runtime`, `implementation` | – | – | Advanced / webpack-compat. Leave unset. | – |
| `experiments` | `{ externalRuntime, provideExternalRuntime, hostProvidesAllShared, ssrMode }` | – | Experimental features (single shared runtime, import-map sharing). | – |

### 3.1 Remote object (`remotes.<key>`)

| Field | Required | Description |
| --- | --- | --- |
| `type` | recommended | `'module'` for Vite (ESM) remotes. `'var'` for webpack/rspack global-format remotes. Omitting it defaults to `'var'` **with a warning**. |
| `name` | ✅ | The remote's container `name`. |
| `entry` | ✅ | URL of `remoteEntry.js` (or `mf-manifest.json` when the remote emits a manifest). |
| `entryGlobalName` | for `var` | Global variable name of a `var` container. Keep it equal to `name`. |
| `shareScope` | – | Share scope(s) used with this remote. |
| `internalName` | – | Override the internal container name (rare). |

String shorthand (webpack style) also works for `var` remotes: `shellA: 'shellA@https://…/remoteEntry.js'`.

### 3.2 Shared config (`shared.<package>`)

| Field | Type | Description |
| --- | --- | --- |
| `singleton` | `boolean` | Only one copy may exist on the page. **Required for `vue`**. |
| `requiredVersion` | `string \| false` | Semver range this container accepts (`'^3.5.0'`). A mismatch logs a warning (or throws with `strictVersion`). |
| `strictVersion` | `boolean` | Throw instead of warning on a version mismatch. |
| `version` | `string` | Version this container provides (defaults to the installed one). |
| `eager` | `boolean` | Bundle the share into the entry chunk instead of loading it async. Avoid unless needed. |
| `import` | `string \| false` | `false` = don't bundle a fallback, the host **must** provide it (else `RUNTIME-012`). |
| `shareScope` | `string` | Put this share in a non-default scope. |
| `shareKey` / `request` | `string` | Register under a different key / import request. |
| `allowNodeModulesSuffixMatch` | `boolean` | Match copies installed in nested `node_modules` (monorepos). |
| `suppressMissingImportWarning` | `boolean` | Silence the warning for `import: false` shares. |
| `treeShaking` | `{ mode, usedExports }` | Experimental shared tree shaking. |

**Rule of thumb for Vue MFEs**: share `vue` as a singleton. Share `vue-router` / `pinia` /
`vuex` **only** if the remote must use the *host's* instance. In this repo they are not shared
on purpose, because every app owns its store and HTTP client.

---

## 4. Config methods, complete shapes & when to use what

This section answers three questions:

1. **How** can federation be configured? (seven methods, with a snippet each)
2. **What is the complete shape** of every config object, at build time and at runtime?
3. **When** should you use which method / option? (decision tables in §4.7)

Shapes below are taken from the installed type definitions
(`@module-federation/vite/lib/*.d.ts`, `@module-federation/runtime-core/dist/type/*.d.ts`),
written as plain JS objects because this repo has no TypeScript.

### 4.1 The configuration methods at a glance

| # | Method | Where it lives | Resolved at | This repo |
| --- | --- | --- | --- | --- |
| A | Inline object in `vite.config.mjs` | `federation({...})` | build / dev start | **host** |
| B | Dedicated config module + `createModuleFederationConfig()` | `module-federation.config.mjs` | build / dev start | – (alternative to A) |
| C | JSON contract + builder function | `shared.federation.json` + `config/federation.mjs` | build / dev start | **shell-a, shell-b** |
| D | Env-driven URLs (`.env.[mode]`) | `.env.development`, `.env.production`, … | build / dev start | **all apps** (combined with A/C) |
| E | Manifest-based remotes | remote emits `mf-manifest.json`, host points `entry` at it | runtime (fetch) | – |
| F | Runtime API (`registerRemotes`, `createInstance`, `loadRemote`) | app code | runtime | – (snippets §4.5) |
| G | Runtime plugins | `runtimePlugins: ['./src/mf/x.mjs']` | runtime hooks | – (snippets §4.6) |

A–D decide **what is compiled in**. E–G decide **what happens in the browser**. Real apps
mix them: this repo is C + D for remotes and A + D for the host.

#### Method A: inline object (host)

Smallest setup. Everything is visible in one file.

```js
// apps/host/vite.config.mjs (simplified)
import { federation } from '@module-federation/vite'

export default defineConfig(({ mode }) => {
  const env = readEnv(mode, root)
  return {
    plugins: [
      vue(),
      federation({
        name: 'host',
        filename: 'remoteEntry.js',
        exposes: { './ui-dev': './src/ui-dev/index.mjs' },
        remotes: {
          shellA: { type: 'module', name: 'shellA', entry: env.raw.VITE_SHELL_A_ENTRY },
          shellB: { type: 'module', name: 'shellB', entry: env.raw.VITE_SHELL_B_ENTRY },
        },
        shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } },
        bundleAllCSS: true,
        shareStrategy: 'loaded-first',
        dts: false,
      }),
    ],
  }
})
```

#### Method B: dedicated config module with `createModuleFederationConfig`

`createModuleFederationConfig(options)` returns `options` unchanged. It exists for editor
autocompletion (JSDoc / types) and to keep the federation contract in its own file, which
other tools (scripts, tests, docs generators) can import without loading Vite.

```js
// apps/host/module-federation.config.mjs
import { createModuleFederationConfig } from '@module-federation/vite'

/** @param {Record<string, string>} env */
export default (env) =>
  createModuleFederationConfig({
    name: 'host',
    filename: 'remoteEntry.js',
    exposes: { './ui-dev': './src/ui-dev/index.mjs' },
    remotes: {
      shellA: { type: 'module', name: 'shellA', entry: env.VITE_SHELL_A_ENTRY },
    },
    shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } },
    dts: false,
  })
```

```js
// apps/host/vite.config.mjs
import mfConfig from './module-federation.config.mjs'
// …
plugins: [vue(), federation(mfConfig(env.raw))]
```

#### Method C: JSON contract + builder (remotes)

A JSON file holds the static contract (name, exposes, remotes, shared). A small builder
turns it into plugin options, injects env URLs and enforces rules. JSON can't hold
functions or env values, which is exactly why it is a good *contract*: it is reviewable and
tool-readable (CI can diff exposes, a portal can list remotes).

```json
// apps/shell-a/shared.federation.json
{
  "name": "shellA",
  "filename": "remoteEntry.js",
  "exposes": { "./App": "./src/expose/App.mjs" },
  "remotes": { "host": { "type": "module", "entryEnv": "VITE_HOST_ENTRY" } },
  "shared": { "vue": { "singleton": true, "requiredVersion": "^3.5.0" } },
  "notShared": { "axios": "own instance", "vuex": "own store" },
  "bundleAllCSS": true,
  "shareStrategy": "loaded-first"
}
```

```js
// apps/shell-a/vite.config.mjs
import { loadFederationJson, createFederationOptions } from './config/federation.mjs'
const fed = loadFederationJson(root)
// …
plugins: [vue(), federation(createFederationOptions(fed, env.raw, pkg))]
```

`createFederationOptions` (in `config/federation.mjs`) maps `entryEnv` → URL, defaults
`type: 'module'`, fails the build if a shared package is missing from `package.json`, and
fails if a package is both `shared` and `notShared`.

#### Method D: env-driven URLs

Never hard-code remote URLs. Put one key per remote in every `.env.[mode]` and read it in the
config. `scripts/check-env.mjs` fails `npm run dev` / `build` when a key is missing or not an
absolute URL.

```ini
# apps/host/.env.staging
VITE_SHELL_A_ENTRY=https://shell-a.staging.example.com/remoteEntry.js
VITE_SHELL_B_ENTRY=https://shell-b.staging.example.com/remoteEntry.js
```

Changing a URL needs a **rebuild** of the consumer. If that's not acceptable, use E or F.

#### Method E: manifest-based remotes

The remote emits `mf-manifest.json` (its exposes, shared deps, assets per expose). The host
points `entry` at the manifest instead of `remoteEntry.js`. The runtime reads the manifest,
then loads the real entry. Benefits: preloading of an expose's JS **and CSS**, DevTools
graph, version info, and the remote can rename its entry file without touching hosts.

```js
// remote
federation({ name: 'shellA', manifest: true /* or { fileName: 'mf-manifest.json' } */ })

// host
remotes: {
  shellA: { type: 'module', name: 'shellA', entry: 'https://shell-a.example.com/mf-manifest.json' },
}
```

#### Method F: runtime API (URLs known only in the browser)

For remotes discovered at runtime: per-tenant URLs, a `/config.json` fetched at boot,
feature-flagged remotes, plugin marketplaces. See full snippets in §4.5.

```js
import { registerRemotes, loadRemote } from '@module-federation/runtime'

const cfg = await fetch('/config.json').then((r) => r.json())
registerRemotes([{ name: 'shellC', type: 'module', entry: cfg.shellCEntry }])
const { default: ShellC } = await loadRemote('shellC/App')
```

#### Method G: runtime plugins

Change **how** things load without changing **what** loads: retries, fallbacks, auth headers
on manifest fetches, URL rewriting, logging. Declared at build time, run in the browser.

```js
federation({ /* … */ runtimePlugins: ['./src/mf/retry-plugin.mjs', ['./src/mf/log.mjs', { level: 'debug' }]] })
```

The tuple form `[path, options]` passes `options` to the plugin's default-export factory.

---

### 4.2 Complete shape: `federation(options)` (build time)

Every key the Vite plugin accepts, with its default. Omit anything you don't need.

```js
federation({
  // ── identity ─────────────────────────────────────────────────────────────
  name: 'shellA',                       // REQUIRED. Unique per page, valid JS identifier
  filename: 'remoteEntry.js',           // remote entry file name (default 'remoteEntry.js')
  varFilename: undefined,               // e.g. 'varRemoteEntry.js': extra entry for webpack/rspack hosts

  // ── what this container offers ───────────────────────────────────────────
  exposes: {
    './App': './src/expose/App.mjs',              // string form
    './routes': { import: './src/expose/routes.mjs' }, // object form
  },

  // ── what this container consumes ─────────────────────────────────────────
  remotes: {
    host: {                                       // object form (recommended)
      type: 'module',                             // 'module' (Vite/ESM) | 'var' | 'esm' | 'system' | …
      name: 'host',                               // REQUIRED: the remote's container name
      entry: 'http://localhost:8080/remoteEntry.js', // REQUIRED: remoteEntry.js or mf-manifest.json
      entryGlobalName: 'host',                    // global name for 'var' containers
      shareScope: 'default',                      // string | string[]
      internalName: undefined,                    // rare: override internal container name
    },
    legacy: 'legacy@https://legacy.example.com/remoteEntry.js', // string form ('var' remotes)
  },

  // ── dependency sharing ───────────────────────────────────────────────────
  shared: {
    vue: {
      singleton: true,             // one copy per page
      requiredVersion: '^3.5.0',   // semver range accepted (false = any)
      strictVersion: false,        // true: throw on mismatch instead of warn
      version: undefined,          // version provided (default: installed version)
      eager: false,                // inline into entry chunk (avoid)
      import: undefined,           // false = never bundle a fallback, consumer must get it shared
      shareScope: 'default',
      shareKey: undefined,         // register under another key
      request: undefined,          // import request to share
      allowNodeModulesSuffixMatch: false,
      suppressMissingImportWarning: false,
      treeShaking: undefined,      // { mode: 'server-calc' | 'runtime-infer', usedExports: [] }
    },
  },
  shareScope: 'default',           // default scope for this container: string | string[]
  shareStrategy: 'version-first',  // 'version-first' | 'loaded-first'

  // ── output / paths ───────────────────────────────────────────────────────
  publicPath: undefined,           // default: Vite `base`, or 'auto' when base is empty
  getPublicPath: undefined,        // JS expression string evaluated at runtime, e.g. "return window.CDN + '/'"
  bundleAllCSS: false,             // add all build CSS to every expose
  ignoreOrigin: false,
  virtualModuleDir: '__mf__virtual',
  hostInitInjectLocation: 'html',  // 'html' | 'entry' (use 'entry' when there is no index.html)

  // ── runtime extensions ───────────────────────────────────────────────────
  runtimePlugins: [],              // Array<string | [string, object]>
  implementation: undefined,       // custom runtime implementation path (advanced)

  // ── manifest ─────────────────────────────────────────────────────────────
  manifest: false,                 // true | { fileName, filePath, disableAssetsAnalyze, additionalData }

  // ── dev server ───────────────────────────────────────────────────────────
  dev: true,                       // false | { disableLiveReload, disableHotTypesReload,
                                   //           disableDynamicRemoteTypeHints, remoteHmr }

  // ── types ────────────────────────────────────────────────────────────────
  dts: true,                       // false here (no TS) | { generateTypes, consumeTypes,
                                   //   tsConfigPath, extraOptions, implementation, cwd, displayErrorInTerminal }

  // ── build tuning ─────────────────────────────────────────────────────────
  moduleParseTimeout: 10,          // seconds
  moduleParseIdleTimeout: undefined,
  target: 'web',                   // 'web' | 'node'
  disableRemote: false,            // strip remote-loading code (container never consumes)
  disableShared: false,            // strip sharing code (no shared deps)
  disableSnapshot: false,          // strip manifest/preload/devtools support

  // ── SSR only ─────────────────────────────────────────────────────────────
  ssrFilename: undefined,
  ssrExternals: [],
  ssrEntryLoader: undefined,       // { strategy: 'temp-file' | 'vm', maxAgeMs, fetchTimeoutMs, fetchMaxBytes }

  // ── tree-shaking of shared deps (experimental) ───────────────────────────
  treeShakingDir: undefined,
  injectTreeShakingUsedExports: undefined,
  treeShakingSharedPlugins: undefined,
  treeShakingSharedExcludePlugins: undefined,

  // ── experiments ──────────────────────────────────────────────────────────
  experiments: {
    externalRuntime: false,        // read runtime-core from globalThis._FEDERATION_RUNTIME_CORE
    provideExternalRuntime: false, // publish runtime-core for others (exactly one container per page)
    hostProvidesAllShared: false,  // import-map sharing: host provides every shared dep
    ssrMode: undefined,            // 'ISLAND' (React SSR islands)
  },

  // ── webpack-compat leftovers (leave unset) ───────────────────────────────
  library: undefined,
  runtime: undefined,
})
```

#### Shape variants you'll see

```js
// remotes: string vs object
remotes: { shellA: 'shellA@https://x/remoteEntry.js' }                          // 'var' style
remotes: { shellA: { type: 'module', name: 'shellA', entry: 'https://x/remoteEntry.js' } } // Vite style

// shared: three forms
shared: ['vue', 'vue-router']                     // array: defaults for each
shared: { vue: '^3.5.0' }                         // string: requiredVersion only
shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } } // object: full control

// exposes: two forms
exposes: { './App': './src/App.vue' }
exposes: { './App': { import: './src/App.vue' } }

// manifest
manifest: true
manifest: {
  fileName: 'mf-manifest.json',
  filePath: 'meta',                 // sub-folder inside outDir
  disableAssetsAnalyze: false,      // true = smaller manifest, no per-expose asset lists (no preload)
  additionalData: ({ stats, manifest, pluginOptions, bundler }) => ({ ...manifest, team: 'cart' }),
}

// dev
dev: { disableLiveReload: false, remoteHmr: true /* or 'full-reload' */ }

// dts (TypeScript projects only)
dts: { generateTypes: true, consumeTypes: true, tsConfigPath: './tsconfig.json' }
```

---

### 4.3 Complete shape: runtime options (`createInstance` / `init`)

The build plugin generates this object for you. You only write it yourself when you use the
runtime **without** the build plugin (method F from scratch) or create a second instance.

```js
const userOptions = {
  name: 'host',                      // REQUIRED
  version: undefined,                // optional version tag of this container
  remotes: [                         // Array, not object!
    { name: 'shellA', entry: 'https://x/remoteEntry.js', type: 'module', alias: 'cart' },
    { name: 'shellB', version: '1.2.0' },          // RemoteWithVersion (snapshot/manifest setups)
    // common fields: alias, shareScope, type, entryGlobalName
  ],
  shared: {
    vue: {
      version: '3.5.13',
      scope: 'default',              // string | string[]
      lib: () => Vue,                // sync factory  (one of lib / get)
      // get: () => import('vue').then((m) => () => m),  // async factory
      shareConfig: {
        singleton: true,
        requiredVersion: '^3.5.0',   // REQUIRED inside shareConfig: string | false
        eager: false,
        strictVersion: false,
        layer: null,
      },
      strategy: 'loaded-first',      // deprecated here, use top-level shareStrategy
      deps: [],
      treeShaking: undefined,
    },
  },
  plugins: [],                       // ModuleFederationRuntimePlugin[]
  shareStrategy: 'loaded-first',     // 'version-first' | 'loaded-first'
}
```

`type` (`RemoteEntryType`) values: `'module'` and `'esm'` (ES module entries, use for Vite),
`'var'` / `'global'` (webpack global), `'system'`, `'commonjs'` variants for Node. Vite
remotes are always `'module'`.

### 4.4 Complete shape: runtime API

```js
import {
  createInstance, init, getInstance,
  loadRemote, loadShare, loadShareSync,
  registerRemotes, registerShared, registerPlugins, registerGlobalPlugins,
  preloadRemote,
  getRemoteEntry, getRemoteInfo, loadScript, loadScriptNode, satisfy,
  ModuleFederation, Module,
} from '@module-federation/runtime'
```

| Function | Signature (JS) | Returns | Use it to |
| --- | --- | --- | --- |
| `createInstance` | `createInstance(userOptions)` | `ModuleFederation` | Create a **new, independent** instance (does not replace the global one). |
| `init` | `init(userOptions)` | `ModuleFederation` | Create or merge into the **global** instance. Only when there is no build plugin. |
| `getInstance` | `getInstance()` / `getInstance((i) => i.name === 'host')` | instance \| `null` | Get the instance the build plugin created. |
| `loadRemote` | `loadRemote('shellA/App', { loadFactory = true, from = 'runtime' }?)` | `Promise<module \| null>` | Load an exposed module by `remoteName/expose` (or `alias/expose`). |
| `loadShare` | `loadShare('vue', { customShareInfo, resolver }?)` | `Promise<false \| () => module>` | Get the negotiated shared module. Call the returned factory. |
| `loadShareSync` | `loadShareSync('vue')` | `() => module` | Same, sync. Throws (`RUNTIME-005/006`) if not loaded yet. |
| `registerRemotes` | `registerRemotes(remotes[], { force: false }?)` | `void` | Add remotes at runtime. `force: true` replaces an existing one and clears its cache. |
| `registerShared` | `registerShared({ pkg: ShareArgs })` | `void` | Provide extra shared modules at runtime. |
| `registerPlugins` | `registerPlugins([plugin])` | `void` | Add runtime plugins to the current instance. |
| `registerGlobalPlugins` | `registerGlobalPlugins([plugin])` | `void` | Add plugins for **every** instance created afterwards. |
| `preloadRemote` | `preloadRemote([PreloadRemoteArgs])` | `Promise<void>` | Fetch a remote's entry/assets ahead of time. |
| `satisfy` | `satisfy('3.5.13', '^3.5.0')` | `boolean` | The semver check the runtime itself uses. |
| `loadScript` | `loadScript(url, { attrs, createScriptHook })` | `Promise<void>` | Load a classic script with the runtime's loader. |

`PreloadRemoteArgs` shape:

```js
{
  nameOrAlias: 'shellA',          // REQUIRED
  exposes: ['./App'],             // default: all exposes
  resourceCategory: 'sync',       // 'all' | 'sync' (sync = only what the expose needs immediately)
  share: false,                   // also preload shared deps
  depsRemote: true,               // true | false | Array<{ nameOrAlias, exposes, … }>
  filter: (url) => !url.endsWith('.map'),
  recordPreloadedAssets: true,    // skip assets already preloaded
}
```

Note: `import('shellA/App')` in this repo **is** `loadRemote('shellA/App')`: the plugin
rewrites remote imports to runtime calls. Use the static `import()` when the remote is
declared in config; use `loadRemote` when it was added with `registerRemotes`.

### 4.5 Runtime API snippets

All snippets work in this repo: `@module-federation/runtime` is installed with the Vite
plugin. Add it to the app's `dependencies` (same version) before importing it directly.

```js
// 1. Get the instance the build plugin created
import { getInstance } from '@module-federation/runtime'
const mf = getInstance()
console.log(mf.name, mf.options.remotes)
```

```js
// 2. Register a remote known only at runtime, then load it as a Vue component
import { registerRemotes, loadRemote } from '@module-federation/runtime'
import { defineAsyncComponent } from 'vue'

registerRemotes([{ name: 'shellC', type: 'module', entry: window.APP_CONFIG.shellCEntry }])
export const ShellC = defineAsyncComponent(() =>
  loadRemote('shellC/App').then((m) => m.default),
)
```

```js
// 3. Point an existing remote at another URL (e.g. QA build) and drop its cache
registerRemotes([{ name: 'shellA', type: 'module', entry: 'https://qa.example.com/remoteEntry.js' }], { force: true })
```

```js
// 4. Read the negotiated shared Vue (which copy won?)
import { loadShare } from '@module-federation/runtime'
const factory = await loadShare('vue')
const vue = factory && factory()
console.log('shared vue version', vue?.version)
```

```js
// 5. Provide a shared module at runtime (e.g. a host-only util)
import { registerShared } from '@module-federation/runtime'
import * as dayjs from 'dayjs'
registerShared({
  dayjs: { version: '1.11.13', lib: () => dayjs, shareConfig: { singleton: true, requiredVersion: '^1.11.0' } },
})
```

```js
// 6. Preload on hover / before navigation
import { preloadRemote } from '@module-federation/runtime'
link.addEventListener('mouseenter', () => preloadRemote([{ nameOrAlias: 'shellB', exposes: ['./App'] }]), { once: true })
```

```js
// 7. A fully separate instance (sandboxed widget, tests)
import { createInstance } from '@module-federation/runtime'
const widgetMf = createInstance({
  name: 'widgetHost',
  remotes: [{ name: 'widget', type: 'module', entry: 'https://cdn.example.com/widget/remoteEntry.js' }],
  shared: {},
})
const widget = await widgetMf.loadRemote('widget/Embed')
```

```js
// 8. Add a plugin at runtime (only affects loads that happen afterwards)
import { registerPlugins } from '@module-federation/runtime'
registerPlugins([{ name: 'trace', afterLoadRemote: ({ id }) => console.debug('[mf] loaded', id) }])
```

---

### 4.6 Complete shape: runtime plugin + every hook

```js
// src/mf/my-plugin.mjs  (referenced from runtimePlugins, default export = factory)
export default function myPlugin(options = {}) {
  return {
    name: 'my-plugin',      // REQUIRED, unique
    version: '1.0.0',       // optional
    apply(instance) {},     // optional: called with the ModuleFederation instance
    // …any hooks below
  }
}
```

Hook kinds: **SyncHook** (return ignored or a value), **AsyncHook** (may return a promise),
**Waterfall** (must return the (modified) args object, which is passed to the next plugin).

| Group | Hook | Kind | Args (main fields) | Typical use |
| --- | --- | --- | --- | --- |
| core | `beforeInit` | sync waterfall | `{ userOptions, options, origin }` | Rewrite options before the instance starts (inject remotes from `window`). |
| core | `init` | sync | `{ options, origin }` | Log / inspect final options. |
| core | `beforeInitContainer` | async waterfall | `{ shareScope, initScope, remoteEntryInitOptions, remoteInfo, origin }` | Adjust share scope before a remote container's `init()`. |
| core | `initContainer` | async waterfall | `{ …, remoteEntryExports, id, remoteSnapshot }` | After a remote container initialised. |
| remote | `beforeRegisterRemote` | sync waterfall | `{ remote, origin }` | Rewrite a remote entry URL (env/CDN switch). |
| remote | `registerRemote` | sync waterfall | `{ remote, origin }` | Observe registrations. |
| remote | `beforeRequest` | async waterfall | `{ id, options, origin }` | Rewrite the requested id (`shellA/App` → `shellA/AppV2`). |
| remote | `afterMatchRemote` | async | `{ id, pkgNameOrAlias, expose, remote, options, origin, remoteInfo }` | Know which remote matched. |
| remote | `onLoad` | async | `{ id, expose, pkgNameOrAlias, remote, options, origin, exposeModule, exposeModuleFactory, moduleInstance }` | Wrap / decorate a loaded module. |
| remote | `afterLoadRemote` | async | `{ id, expose, remote, origin, … }` | Metrics after a successful load. |
| remote | `errorLoadRemote` | async | `{ id, error, from, lifecycle, remote, expose, origin }` | **Fallbacks**: return a module-shaped value instead of failing. |
| remote | `handlePreloadModule` | sync | `{ id, name, remote, remoteSnapshot, preloadConfig, origin }` | Customise preloading. |
| remote | `beforePreloadRemote` / `generatePreloadAssets` / `afterPreloadRemote` | async | preload args / results | Control which assets get preloaded. |
| remote | `loadEntry` | async | `{ origin, loaderHook, remoteInfo, remoteEntryExports, resourceContext }` | Return your own `{ get, init }` container (custom loading, tests). |
| shared | `beforeRegisterShare` / `afterRegisterShare` | sync | `{ pkgName, shared, origin }` | Inspect what is provided. |
| shared | `beforeLoadShare` | async waterfall | `{ pkgName, shareInfo, shared, origin }` | Force a specific version. |
| shared | `loadShare` | async | `(origin, pkgName, shareInfos)` | Replace share loading entirely. |
| shared | `afterLoadShare` / `errorLoadShare` | sync | `{ pkgName, … }` | Log / fallback for shared deps. |
| shared | `resolveShare` | sync waterfall | `{ shareScopeMap, scope, pkgName, version, GlobalFederation, resolver }` | Override the version-picking algorithm. |
| shared | `initContainerShareScopeMap` | sync waterfall | `{ shareScope, options, origin, … }` | Merge scopes between containers. |
| shared | `afterResolve` | async waterfall | match info | Adjust the resolved remote/share. |
| loader | `getModuleInfo` | sync | `{ target, key }` | Resolve snapshot info. |
| loader | `createScript` | sync | `{ url, attrs }` | Add `nonce`, `crossorigin`, `integrity` to script tags. Return a `script` element or `{ script, timeout }`. |
| loader | `createLink` | sync | `{ url, attrs }` | Same for `<link>` (CSS / preload). |
| loader | `fetch` | async | `(url, init, remoteInfo, resourceContext)` | Add auth headers, retries, caching for manifest fetches. Return a `Response` promise. |
| loader | `loadEntryError` | async | `{ getRemoteEntry, origin, remoteInfo, remoteEntryExports, globalLoading, uniqueKey }` | Retry / alternative URL when a remote entry fails. |
| loader | `afterLoadEntry` | async | `{ remoteInfo, … }` | Observe loaded entries. |
| loader | `beforeInitRemote` / `afterInitRemote` | async | `{ remoteInfo, … }` | Around container `init()`. |
| loader | `beforeGetExpose` / `afterGetExpose` | async | `{ remoteInfo, expose, … }` | Around `container.get(expose)`. |
| loader | `beforeExecuteFactory` / `afterExecuteFactory` | async | `{ remoteInfo, … }` | Around running the module factory. |
| loader | `getModuleFactory` | async | `{ remoteEntryExports, expose, moduleInfo }` | Return your own module factory. |
| bridge | `beforeBridgeRender` / `afterBridgeRender` / `beforeBridgeDestroy` / `afterBridgeDestroy` / `afterBridgeRouteSync` | sync | props / context | Only with `@module-federation/bridge-*` (React/Vue bridge). |
| snapshot | `beforeLoadRemoteSnapshot` / `loadSnapshot` / `loadRemoteSnapshot` / `afterLoadSnapshot` | async | snapshot info | Manifest-based setups: rewrite or cache manifests. |

Plugin snippets:

```js
// CSP nonce on every script the runtime injects
export default () => ({
  name: 'csp-nonce',
  createScript({ url, attrs }) {
    const s = document.createElement('script')
    s.src = url
    s.type = 'module'
    s.nonce = document.querySelector('meta[name="csp-nonce"]')?.content
    return s
  },
})
```

```js
// Switch every remote to a CDN in production, keep dev URLs locally
export default ({ cdn }) => ({
  name: 'cdn-rewrite',
  beforeRegisterRemote(args) {
    if (cdn && 'entry' in args.remote) args.remote.entry = args.remote.entry.replace(/^https?:\/\/[^/]+/, cdn)
    return args
  },
})
```

```js
// Fallback component when a remote is down (Vue render function)
import { h } from 'vue'
export default () => ({
  name: 'vue-fallback',
  errorLoadRemote({ id, lifecycle }) {
    if (lifecycle !== 'onLoad' && lifecycle !== 'afterResolve' && lifecycle !== 'beforeRequest') return
    return { default: { name: 'RemoteDown', render: () => h('p', { class: 'remote-down' }, `${id} is unavailable`) } }
  },
})
```

---

### 4.7 When to use what

#### Which configuration method?

| Situation | Use | Why |
| --- | --- | --- |
| One or two apps, small team | **A** inline | Least indirection. |
| Config is long, or scripts/tests need to read it without Vite | **B** `createModuleFederationConfig` | Separate, importable, autocompletion. |
| Many remotes, platform team reviews contracts, CI diffs exposes | **C** JSON contract + builder | Static, tool-readable, rules enforced in one place. Used for shell-a/shell-b. |
| URL differs per environment, a rebuild per environment is fine | **D** env vars | Simple, validated by `check:env`. Used everywhere here. |
| Need preloading of JS+CSS, DevTools graph, version info | **E** manifest | Richer metadata than `remoteEntry.js`. |
| Same build deployed to many environments/tenants, URL decided at boot | **F** runtime `registerRemotes` | No rebuild to move a remote. |
| Cross-cutting behaviour (retry, fallback, CSP, auth, logging) | **G** runtime plugin | Keeps loading policy out of components. |

#### How to load a remote module

| Need | Use |
| --- | --- |
| Route-level page, remote declared in config | `component: () => import('shellA/App')` (lazy route) |
| Component inside a page, with loading/error UI | `defineRemoteComponent(() => import('shellA/App'))` (`src/utils/defineRemoteComponent.mjs`, wraps `defineAsyncComponent`) |
| Remote added at runtime | `loadRemote('shellC/App')` |
| Library of many small exports used across the app (`host/ui-dev`) | `await import('host/ui-dev')` once at boot, then auto-imported named imports |
| Warm the cache before the user clicks | `preloadRemote(...)` or a fire-and-forget `import()` in `router.beforeEach` |

#### `type: 'module'` vs `'var'`

| Remote built with | `type` |
| --- | --- |
| Vite (`@module-federation/vite`) | `'module'` |
| webpack 5 / rspack, `library.type: 'var'` (default) | `'var'` + `entryGlobalName` |
| webpack/rspack with `library: { type: 'module' }` | `'module'` |
| Vite remote consumed by a webpack host | remote adds `varFilename`, webpack host uses `name@url/varRemoteEntry.js` |

#### `shareStrategy`

| Use | When |
| --- | --- |
| `'loaded-first'` | Default choice for Vite MFEs. Remotes load lazily; standalone remotes don't fetch other remotes at startup. Used here. |
| `'version-first'` | Several remotes ship different versions of a shared lib and you need the **highest compatible** version picked up front. Costs: all remote entries are fetched at startup, and one offline remote slows boot. |

#### Shared options

| Option | Use when | Avoid when |
| --- | --- | --- |
| `singleton: true` | Library holds global state or identity checks (`vue`, `vue-router` if shared, `pinia`) | Pure utilities (lodash): multiple copies are harmless |
| `requiredVersion` | Always for singletons, so mismatches are visible | – |
| `strictVersion: true` | A mismatch would break at runtime (major versions) | You prefer a warning and a working page |
| `eager: true` | A module reads the shared lib at evaluation time in the entry chunk and you can't make it async | Normally: it inflates the entry and disables negotiation for that lib |
| `import: false` | Host **guarantees** it provides the lib (remote never runs standalone) | The remote must also run standalone (our shells do) |
| Don't share at all | Each app needs its own instance (axios with own interceptors, own Vuex store) | – |

#### CSS

| Situation | Use |
| --- | --- |
| Exposed component has `<style>` / imports Sass | `bundleAllCSS: true` (this repo) |
| Remote ships a big global stylesheet that must not leak into the host | Keep global styles in the remote's `index.html` (standalone only), scope the rest |
| Theme tokens shared by all apps | CSS custom properties (`--ui-*` from `host/ui-dev`) |

#### Exposes granularity

| Expose | When |
| --- | --- |
| One `./App` per remote | Remote is a self-contained page/area (shell-a, shell-b) |
| Many small exposes (`./Button`, `./useCart`) | Library containers like `host/ui-dev`. Keep the API stable and versioned |
| `./routes` | Host wants to mount the remote's routes in its own router |

#### Communication between apps

| Need | Use | In repo |
| --- | --- | --- |
| Fire-and-forget notifications (cart count) | `window` `CustomEvent` (`mfe:*`) | `src/utils/mfeBus.mjs` |
| Data the remote needs at mount | Props on the remote component | – |
| Session/auth state | `sessionStorage` contract (`mfe.auth`) | host login |
| Real shared reactive state | Share a store **package** as singleton | not used on purpose |

#### Manifest or plain `remoteEntry.js`?

| Choose | When |
| --- | --- |
| `remoteEntry.js` | Simple setups, no preload needs, smallest moving parts (this repo) |
| `mf-manifest.json` | You want `preloadRemote` with CSS, the DevTools graph, version info, or remote-controlled entry names |

---

## 5. Dev vs build

| Concern | `vite` (dev) | `vite build` + `vite preview` |
| --- | --- | --- |
| remoteEntry | served by the dev server, modules on demand | static file in `dist/` |
| Asset URLs | `server.origin` must be absolute (`http://localhost:8081`) | `base` must be absolute (`VITE_PUBLIC_URL`) |
| CSS | injected by JS (HMR) | `bundleAllCSS: true` injects it with the expose |
| HMR | works inside each app; editing a remote reloads it in the host | – |
| Mode / env | `.env.development` | `.env.[mode]` (`preview` here uses `--mode localprod`) |

---

## 6. Snippets

### 6.1 Safe remote component with loading/error states (in repo)

```js
// apps/host/src/utils/defineRemoteComponent.mjs
export function defineRemoteComponent(loader, label) {
  return defineAsyncComponent({
    loader,
    delay: 150,
    timeout: 15_000,
    loadingComponent: { render: () => h(RemoteFallback, { label, state: 'loading' }) },
    errorComponent: { props: ['error'], render() { return h(RemoteFallback, { label, state: 'error', error: this.error }) } },
  })
}
```

### 6.2 Wait for a federated dependency before rendering (in repo)

```js
// apps/shell-a/src/expose/App.mjs
await import('host/ui-dev')          // top-level await: host waits for this
export { default } from '../App.vue'
```

### 6.3 Environment-specific remote URLs (in repo)

```json
// shared.federation.json
"remotes": { "host": { "type": "module", "entryEnv": "VITE_HOST_ENTRY" } }
```

```bash
# .env.production
VITE_HOST_ENTRY=https://app.example.com/remoteEntry.js
```

### 6.4 Runtime plugin: log + fallback when a remote fails

```js
// apps/host/src/mf/fallback-plugin.mjs
export default function fallbackPlugin() {
  return {
    name: 'fallback-plugin',
    beforeRequest(args) {
      console.debug('[mf] loading', args.id)
      return args
    },
    errorLoadRemote({ id, error }) {
      console.error(`[mf] ${id} failed`, error)
      // Return a module-shaped object so the import still resolves
      return { default: { render: () => null } }
    },
  }
}
```

```js
// vite.config.mjs
federation({ /* … */ runtimePlugins: ['./src/mf/fallback-plugin.mjs'] })
```

### 6.5 Retry flaky remote entries

```js
// apps/host/src/mf/retry-plugin.mjs
export default function retryPlugin({ retries = 2, delay = 500 } = {}) {
  return {
    name: 'retry-plugin',
    async fetch(url, init) {
      for (let i = 0; ; i++) {
        try {
          const res = await fetch(url, init)
          if (res.ok || i >= retries) return res
        } catch (e) {
          if (i >= retries) throw e
        }
        await new Promise((r) => setTimeout(r, delay * (i + 1)))
      }
    },
  }
}
```

(The official `@module-federation/retry-plugin` package does the same with more options.)

### 6.6 Register remotes at runtime (URL known only at runtime)

```js
// needs: npm i @module-federation/runtime  (same major as the plugin's runtime)
import { getInstance } from '@module-federation/runtime'

const mf = getInstance()
mf.registerRemotes([
  { name: 'shellC', entry: `${window.APP_CONFIG.shellCUrl}/remoteEntry.js`, type: 'module' },
])
const mod = await mf.loadRemote('shellC/App')
```

### 6.7 Expose more than a component

```json
"exposes": {
  "./App": "./src/expose/App.mjs",
  "./routes": "./src/expose/routes.mjs",
  "./useCart": "./src/composables/useCart.mjs"
}
```

Keep exposed APIs small and backward compatible. Don't expose a Vuex store instance unless
consumers really need its state; events (`mfe:*`) are looser coupling.

### 6.8 Preload a remote before navigation

```js
router.beforeEach((to) => {
  if (to.name === 'shell-a') import('shellA/App') // warm the cache, don't await
})
```

### 6.9 Use a webpack remote from this Vite host

```js
remotes: {
  legacy: { type: 'var', name: 'legacy', entry: 'https://legacy.example.com/remoteEntry.js', entryGlobalName: 'legacy' },
}
```

And to let a **webpack host** consume a Vite remote, add `varFilename: 'varRemoteEntry.js'` to
the remote and point the webpack host at `shellA@https://…/varRemoteEntry.js`.

### 6.10 Emit a manifest and load by manifest

```js
// remote
federation({ name: 'shellA', manifest: true, /* … */ })   // emits dist/mf-manifest.json
// host
remotes: { shellA: { type: 'module', name: 'shellA', entry: 'https://shell-a.example.com/mf-manifest.json' } }
```

### 6.11 Inspect the runtime in the browser console

```js
globalThis.__FEDERATION__                 // all runtime instances, share scopes, loaded remotes
globalThis.__FEDERATION__.__INSTANCES__   // one per container on the page
```

The **Module Federation DevTools** Chrome extension shows the dependency graph and lets you
point a remote at a different URL (e.g. your local dev server) on a deployed page.

---

## 7. Error reference: every coded error

This section covers each runtime error code in the order you'll debug it: **when** it happens,
**why**, a **snippet that reproduces it**, **how to diagnose**, the **fix** (with code), and
**what to watch out for**. Messages, `args` fields and the places that throw them come from
the installed runtime (`@module-federation/runtime-core` 2.9.x, `@module-federation/error-codes`).
Official reference: [module-federation.io/guide/troubleshooting/runtime](https://module-federation.io/guide/troubleshooting/runtime.html).

### 7.1 How to read a runtime error

Every coded error is built the same way (`getShortErrorMsg` in `@module-federation/error-codes`):

```
[ Federation Runtime ]: Failed to load script resources. #RUNTIME-008      ← description + code
args: {"remoteName":"shellA","resourceUrl":"http://localhost:8081/remoteEntry.js"}  ← context
View the docs to see how to solve: https://module-federation.io/guide/troubleshooting/runtime#runtime-008
Original Error Message:                                                     ← only some codes
 TypeError: Failed to fetch dynamically imported module: http://localhost:8081/remoteEntry.js
```

1. **The code** tells you the phase (table below).
2. **`args`** names the host, the remote, the URL or the expose. Start there.
3. **`Original Error Message`** (008, 003, 015) is the browser's or the remote's own error.
   It is usually the real cause.

You can reproduce most errors without a browser. This prints the exact messages above
(run it from the repo root with Node 22):

```js
// scripts/mf-errors-demo.mjs   (npm run mf:errors)
import * as rt from '@module-federation/runtime'

const show = async (code, fn) => {
  try { await fn() } catch (e) { console.log(`\n--- ${code}\n${e.message}`) }
}

await show('RUNTIME-009', () => rt.loadRemote('shellA/App'))            // no instance yet
const mf = rt.init({
  name: 'host',
  remotes: [{ name: 'shellA', type: 'module', entry: 'http://127.0.0.1:9/remoteEntry.js' }],
})
await show('RUNTIME-004', () => mf.loadRemote('shellZ/App'))             // unknown remote
await show('RUNTIME-008', () => mf.loadRemote('shellA/App'))             // nothing listening
rt.registerShared({
  dep: { version: '1.0.0', get: () => Promise.resolve(() => ({})), shareConfig: { requiredVersion: false } },
})
await show('RUNTIME-006', () => mf.loadShareSync('dep'))                  // async share, sync call
```

> In Node, RUNTIME-008 shows as `Failed to load Node.js entry for remote "shellA" … fetch failed`,
> because the Node loader is used. In the browser you get the coded message.

### 7.2 Which phase throws which code

`import('shellA/App')` (compiled to `loadRemote('shellA/App')`) walks through these steps.
The code tells you which step failed.

| # | Step | What the runtime does | Codes |
| --- | --- | --- | --- |
| 0 | Instance | Host init script creates the federation instance (`createInstance`/`init`) | **009**, **010** |
| 1 | Match | Splits `shellA/App` into remote `shellA` + expose `./App`, finds `shellA` in `remotes` | **004** |
| 2 | Snapshot / manifest | Only when `entry` is `mf-manifest.json` or a version: fetch + validate manifest | **003**, **013**, **007**, **011** |
| 3 | Load entry | Injects / imports `remoteEntry.js`, reads its exports | **008**, **001** |
| 4 | Init container | Calls `container.init(shareScope)` to negotiate shared deps | **002**, **015** |
| 5 | Get expose | Calls `container.get('./App')` | **014** |
| 6 | Shared deps | `loadShare` / `loadShareSync` for `vue` etc. | **005**, **006**, **012** |

### 7.3 Triage: symptom → code

| You see | Most likely code | First check |
| --- | --- | --- |
| Blank remote area, red 404/ERR_CONNECTION_REFUSED in Network | 008 | Is the remote's dev server running? Is the URL in `.env.[mode]` right? |
| `blocked by CORS policy` in Console | 008 | Remote's `VITE_CORS_ORIGINS` includes the page's origin? |
| Entry URL returns HTML | 001 / 008 | SPA fallback served `index.html` for a wrong path |
| Works in dev, fails after `vite build` | 008 / 014 / 015 | Absolute `base` (`VITE_PUBLIC_URL`), same `filename`, remote deployed first |
| Works standalone, fails in host | 015 / 005 | Shared dependency versions, eager / top-level reads of shared libs |
| Works in host, fails standalone | 008 / 012 | The remote's own remotes (here: `host/ui-dev`) must be reachable |
| `import('shellA/Foo')` fails, `shellA/App` works | 014 | `exposes` keys |
| Only with `mf-manifest.json` URLs | 003 / 013 / 007 / 011 | Manifest URL, CORS, manifest content |
| Only when calling the runtime API yourself | 009 / 010 / 006 | Order of calls, duplicate runtime package |

### 7.4 Every runtime code in detail

#### RUNTIME-001: Failed to get remoteEntry exports

```
[ Federation Runtime ]: Failed to get remoteEntry exports. #RUNTIME-001
args: {"remoteName":"legacy","remoteEntryUrl":"https://legacy.example.com/remoteEntry.js","remoteEntryKey":"legacy"}
```

**When it happens:** step 3, right after a **script-type** entry (`type: 'var'`, `'global'`,
`'script'`) finished loading. Thrown in `runtime-core/src/utils/load` (`handleRemoteEntryLoaded`).

**Why:** the script loaded without a network error, but the global it should have created
(`window[remoteEntryKey]`, i.e. `entryGlobalName`) doesn't exist. Common reasons:

- `entryGlobalName` differs from the remote's real `name` (`shell_a` vs `shellA`).
- The URL served **something else that happens to be valid JS or HTML**: an SPA fallback
  `index.html`, a CDN error page, a redirect to a login page.
- The remote is an **ES module** (every Vite remote) but the host declared `type: 'var'`.
  An ES module never writes a global.
- The remote was built with `library.type: 'module'` / `'system'` but declared as `var`.

**Reproduce:**

```js
// host: a Vite (ESM) remote declared as a webpack "var" remote
remotes: { shellA: { type: 'var', name: 'shellA', entry: 'http://localhost:8081/remoteEntry.js' } }
```

**Diagnose:**

```js
// 1. what does the URL really return?
fetch('http://localhost:8081/remoteEntry.js').then((r) => console.log(r.status, r.headers.get('content-type')))
// 2. after the error, is the global there?
console.log(Object.keys(window).filter((k) => /shell/i.test(k)))
```

- Content-type `text/html` → wrong URL / SPA fallback.
- File starts with `import …` / `export …` → it is ESM, use `type: 'module'`.
- File starts with `var shellA;` → `var` entry, check the global's name.

**Fix:**

```js
// Vite remote → always 'module'
shellA: { type: 'module', name: 'shellA', entry: 'http://localhost:8081/remoteEntry.js' }

// webpack/rspack remote with library.type 'var' → global must match the remote's name
legacy: { type: 'var', name: 'legacy', entry: 'https://legacy.example.com/remoteEntry.js', entryGlobalName: 'legacy' }
```

**Watch out for:**
- Two remotes with the same `name` overwrite each other's global.
- A `name` with a dash (`shell-a`) produces a different global than you expect. Use valid
  JS identifiers (`shellA`).
- Servers that answer every unknown path with `200 index.html` hide this as a "successful"
  load. Configure the static host to return 404 for missing `.js` files.

---

#### RUNTIME-002: The remote entry interface does not contain "init"

```
[ Federation Runtime ]: The remote entry interface does not contain "init" #RUNTIME-002
args: {"hostName":"host","remoteName":"shellA","remoteEntryUrl":"…/remoteEntry.js","remoteEntryKey":"shellA"}
```

**When it happens:** step 4, before `container.init()` is called (`runtime-core/src/module`).

**Why:** the entry loaded and exported *something*, but not a federation container
(`{ get, init }`):

- `entry` points to the app's **main bundle** (`/assets/index-abc.js`) or `index.html`
  instead of `remoteEntry.js`.
- The `filename` changed on the remote (`remoteEntry.[hash].js`) and the host still loads an
  old file that is now a different chunk.
- A custom `loadEntry` / `getModuleFactory` runtime plugin returned the wrong object.
- A very old (webpack MF v1 era) container, or a global that another script overwrote.

**Reproduce:**

```js
shellA: { type: 'module', name: 'shellA', entry: 'http://localhost:8081/src/main.mjs' } // app entry, not a container
```

**Diagnose:**

```js
const m = await import('http://localhost:8081/remoteEntry.js')
console.log(Object.keys(m))     // a Vite container exports: get, init (+ helpers)
```

**Fix:** point `entry` at the file named by the remote's `filename` (here `remoteEntry.js`), at
the root of the remote's `base`. For `var` remotes keep `entryGlobalName === name`. If you
wrote a `loadEntry` plugin, return `{ get, init }`.

**Watch out for:** CDN paths that add a version folder (`/v1.4.2/remoteEntry.js`) in one
environment only. Keep the URL in `.env.[mode]` and run `npm run check:env`.

---

#### RUNTIME-003: Failed to get manifest

```
[ Federation Runtime ]: Failed to get manifest. #RUNTIME-003
args: {"manifestUrl":"https://shell-a.example.com/mf-manifest.json","moduleName":"shellA","hostName":"host"}
Original Error Message:
 TypeError: Failed to fetch
```

**When it happens:** step 2, only when a remote's `entry` is a **manifest** (`…/mf-manifest.json`).
Thrown in `SnapshotHandler.getManifestJson` after the `fetch` hook and every recovery hook gave up.

**Why:** the manifest `fetch()` failed or its body isn't JSON: 404 (the remote doesn't emit a
manifest), CORS, network error, auth redirect returning HTML, or `JSON.parse` failing.

**Reproduce:**

```js
// remote without manifest: true, host asks for the manifest anyway
shellA: { type: 'module', name: 'shellA', entry: 'http://localhost:8081/mf-manifest.json' }
```

**Diagnose:**

```js
const r = await fetch('http://localhost:8081/mf-manifest.json')
console.log(r.status, r.headers.get('content-type'), (await r.text()).slice(0, 80))
```

**Fix:**

```js
// remote: emit it
federation({ name: 'shellA', manifest: true /* → dist/mf-manifest.json */ })

// or host: go back to the plain entry
shellA: { type: 'module', name: 'shellA', entry: 'http://localhost:8081/remoteEntry.js' }
```

Add auth headers or retries for manifests with a runtime plugin:

```js
export default () => ({
  name: 'manifest-auth',
  async fetch(url, init) {
    if (!url.endsWith('mf-manifest.json')) return
    return fetch(url, { ...init, credentials: 'include', headers: { ...init?.headers, 'x-api-gateway-key': import.meta.env.VITE_API_GATEWAY_KEY } })
  },
})
```

**Watch out for:** the manifest is fetched with `fetch()`, so CORS applies even where a
`<script>` tag would have worked. In dev, Vite's `server.cors` must allow the host's origin.

---

#### RUNTIME-004: Failed to locate remote

```
[ Federation Runtime ]: Failed to locate remote. #RUNTIME-004
args: {"hostName":"host","requestId":"shellZ/App"}
```

**When it happens:** step 1, in `RemoteHandler.getRemoteModuleAndOptions`, before anything is
downloaded.

**Why:** the part before `/` in the request doesn't match any `remotes[].name` or `alias` of
this instance:

- Typo or case difference (`ShellA/App`, `shell-a/App`).
- The remote is declared in **another app's** config (e.g. a remote imports `shellB/App`, but
  only the host declares `shellB`).
- A remote meant to be added at runtime (`registerRemotes`) hasn't been registered yet.
- `alias` used in the request but not set on the remote.

**Reproduce:** see the demo script in 7.1, or:

```js
import('shellZ/App') // 'shellZ' is not in remotes
```

**Diagnose:**

```js
__FEDERATION__.__INSTANCES__.map((i) => [i.name, i.options.remotes.map((r) => r.alias || r.name)])
```

**Fix:**

```js
// 1. static: add it to the consuming app's config
remotes: { shellZ: { type: 'module', name: 'shellZ', entry: env.raw.VITE_SHELL_Z_ENTRY } }

// 2. runtime: register before loading
import { registerRemotes, loadRemote } from '@module-federation/runtime'
registerRemotes([{ name: 'shellZ', type: 'module', entry: url }])
await loadRemote('shellZ/App')
```

Restart `vite` after changing `remotes`. The plugin generates virtual modules at startup.

**Watch out for:** the request id is `<remote name>/<expose without ./>`. `import('shellA/./App')`
or `import('shellA')` (no expose) also fail to match.

---

#### RUNTIME-005: Invalid loadShareSync function call from bundler runtime

```
[ Federation Runtime ]: Invalid loadShareSync function call from bundler runtime #RUNTIME-005
args: {"hostName":"shellA","sharedPkgName":"vue"}
```

**When it happens:** step 6, when **generated bundler code** (`from: 'build'`) needs a shared
module synchronously, the only available provider is still async (`get()` returns a Promise).
Thrown in `SharedHandler.loadShareSync`.

**Why:**
- A module reads a shared library **at evaluation time** in a chunk that runs before the
  share scope is initialised (top-level `createApp()` in the entry, `Vue.version` at the top
  of a module).
- `eager: true` on one side and not the other, so one container expects a sync copy the
  other only offers asynchronously.
- The host init script didn't run first (custom HTML without the injected script, or
  `hostInitInjectLocation` changed).

**Reproduce:**

```js
// remote main.mjs, evaluated before the share scope is ready
shared: { vue: { singleton: true, eager: false } }   // remote
shared: { vue: { singleton: true, eager: true } }    // host: mismatch
```

**Diagnose:** look at `sharedPkgName`. Check every app's `shared[pkg].eager`. In DevTools, set
a breakpoint on the error and look at the call stack: the first non-runtime frame is the
module doing the synchronous read.

**Fix:**

```js
// 1. keep eager identical (this repo: never eager)
shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } }

// 2. move synchronous reads behind an async boundary (this repo's pattern)
// src/expose/App.mjs
await import('host/ui-dev')        // everything after this runs once shares are ready
export { default } from '../App.vue'
```

**Watch out for:** don't "fix" it with `eager: true` everywhere. Eager shares are bundled into
every entry and are not negotiated, so you lose singleton guarantees.

---

#### RUNTIME-006: Invalid loadShareSync function call from runtime

```
[ Federation Runtime ]: Invalid loadShareSync function call from runtime #RUNTIME-006
args: {"hostName":"host","sharedPkgName":"dep"}
```

**When it happens:** step 6, when **your code** calls `loadShareSync('pkg')` and either:
- the provider's `get()` returns a Promise (it hasn't been loaded yet), or
- no provider has a `lib` or `get` at all for that package.

**Why:** `loadShareSync` can only return something that is already in memory.

**Reproduce:** the demo in 7.1 (`registerShared` with an async `get`, then `loadShareSync`).

**Fix:**

```js
// async version: always works
const factory = await loadShare('dep')
const dep = factory && factory()

// or provide a sync copy up front
registerShared({ dep: { version: '1.0.0', lib: () => dep, shareConfig: { requiredVersion: false } } })
```

**Watch out for:** calling `loadShareSync` in module top-level code of a lazily loaded
remote: it may work in dev (already loaded by another app) and fail in production
(different load order).

---

#### RUNTIME-007: Failed to get remote snapshot

```
[ Federation Runtime ]: Failed to get remote snapshot. #RUNTIME-007
args: {"remoteName":"shellA","remoteVersion":"1.2.0","hostName":"host","globalSnapshot":"{…}"}
```

**When it happens:** step 2, in `SnapshotHandler.loadRemoteSnapshotInfo`, when the runtime
needs a snapshot for a remote and **neither** a global snapshot exists **nor** the remote has an
`entry` it can fetch.

**Why:**
- The remote is declared by **version only** (`{ name: 'shellA', version: '1.2.0' }`) and no
  snapshot was provided (by a deploy service, SSR payload, or `addGlobalSnapshot`).
- Module Federation **DevTools** overrides point at a remote/version that doesn't exist.
- A plugin's `loadRemoteSnapshot` / `beforeLoadRemoteSnapshot` hook removed the entry.

**Reproduce:**

```js
init({ name: 'host', remotes: [{ name: 'shellA', version: '1.2.0' }] })
await loadRemote('shellA/App')
```

**Fix:** give every remote an `entry` (`remoteEntry.js` or `mf-manifest.json`), or provide the
snapshot before loading. Clear the Module Federation DevTools overrides (the extension's
clear/reset button), then reload.

**Watch out for:** `disableSnapshot: true` removes manifest support entirely. Use it only if
no remote is loaded by manifest or version.

---

#### RUNTIME-008: Failed to load script resources

```
[ Federation Runtime ]: Failed to load script resources. #RUNTIME-008
args: {"remoteName":"shellA","resourceUrl":"http://localhost:8081/remoteEntry.js"}
Original Error Message:
 TypeError: Failed to fetch dynamically imported module: http://localhost:8081/remoteEntry.js
```

**When it happens:** step 3, when the browser can't load `remoteEntry.js` (or, for ESM remotes,
any module it imports). Thrown in `loadEsmEntry` / `loadEntryScript`. Before throwing, the
runtime gives `loadEntryError` plugins one chance to recover.

**Why:** **The most common error.** The browser couldn't fetch or execute the file.

| Cause | How to see it | Fix in this repo |
| --- | --- | --- |
| Remote not running | Network: `ERR_CONNECTION_REFUSED` | `npm run dev` at the root (starts all three) |
| CORS | Console: `blocked by CORS policy` | Add the page's origin to the remote's `VITE_CORS_ORIGINS` |
| Wrong URL | 404 on `remoteEntry.js` | Fix `VITE_SHELL_*_ENTRY` / `VITE_HOST_ENTRY` in `.env.[mode]` |
| Relative `base` in a build | Chunks requested from the **host's** origin (`:8080/assets/…`) | Absolute `base` (`VITE_PUBLIC_URL`) |
| Preview using production URLs | requests to `example.com` | `npm run preview` (runs `--mode localprod`) |
| Mixed content | HTTPS page loading an HTTP remote | Serve remotes over HTTPS |
| CSP | `Refused to load the script` | Allow remote origins in `script-src` (or nonce via `createScript` hook, §4.6) |
| Blocked host | 403 `Blocked request. This host is not allowed` | Add it to `VITE_ALLOWED_HOSTS` |
| macOS AirPlay on :5000 | 403 with no Vite page | Don't use port 5000 on macOS (this repo uses 8080–8082) |
| Standalone remote, host down | `:8080/remoteEntry.js` fails from `:8081` | Start the host (remotes need `host/ui-dev`) |
| Syntax error in the remote | `Original Error Message: SyntaxError …` | Open the remote standalone and fix the error |
| Stale deploy | 404 on `assets/index-<hash>.js` imported by an old cached `remoteEntry.js` | `Cache-Control: no-cache` on `remoteEntry.js` |

**Diagnose:**

```js
// in the host's console
await import('http://localhost:8081/remoteEntry.js').catch((e) => console.error(e)) // shows the real browser error
```

Then check the Network tab, filtered by the remote's port or domain.

**Fix with code (resilience):** retry and fall back instead of breaking the page.

```js
// src/mf/retry-entry.mjs  (runtimePlugins: ['./src/mf/retry-entry.mjs'])
export default () => ({
  name: 'retry-entry',
  async loadEntryError({ getRemoteEntry, origin, remoteInfo, remoteEntryExports, globalLoading, uniqueKey }) {
    await new Promise((r) => setTimeout(r, 800))      // one retry after 800 ms
    delete globalLoading[uniqueKey]                   // forget the failed attempt
    return getRemoteEntry({ origin, remoteInfo, remoteEntryExports })
  },
})
```

The UI fallback is already in this repo: `defineRemoteComponent` (`src/utils/defineRemoteComponent.mjs`)
shows `RemoteFallback.vue` with a Retry button.

**Watch out for:** `globalLoading` caches the failed promise, so later loads fail instantly
until the page reloads (or the plugin above clears it). `registerRemotes([...], { force: true })`
also resets a remote.

---

#### RUNTIME-009: Please call createInstance first

```
[ Federation Runtime ]: Please call createInstance first. #RUNTIME-009
args: {}
```

**When it happens:** step 0, when you call a **global** runtime function (`loadRemote`,
`loadShare`, `loadShareSync`, `preloadRemote`, `registerRemotes`, `registerPlugins`,
`registerShared`) from `@module-federation/runtime` and that module has no instance yet.

**Why:**
- The call runs **before** the host init code created the instance (top of `main.mjs`, a
  module imported before federation initialised, a test).
- **Two copies** of `@module-federation/runtime` are installed. The plugin initialised copy A,
  your `import` resolved to copy B, which has no instance.
- You use the runtime API in an app without the build plugin and forgot `init()` /
  `createInstance()`.

**Reproduce:** the first line of the demo in 7.1.

**Diagnose:**

```bash
npm ls @module-federation/runtime @module-federation/runtime-core   # must show one version each
```

```js
__FEDERATION__.__INSTANCES__.map((i) => i.name)   // instances exist, but not in "your" copy?
```

**Fix:**

```js
// 1. use the instance the plugin created
import { getInstance } from '@module-federation/runtime'
const mf = getInstance()
await mf.loadRemote('shellA/App')

// 2. no build plugin: create it yourself, once, first
import { createInstance } from '@module-federation/runtime'
export const mf = createInstance({ name: 'host', remotes: [/* … */] })
```

Dedupe: add `@module-federation/runtime` to the app's `dependencies` at the **same version the
plugin uses**, then `npm dedupe`.

**Watch out for:** in this repo you never need the runtime API for normal use: `import('shellA/App')`
is enough.

---

#### RUNTIME-010: The name option cannot be changed after initialization

```
[ Federation Runtime ]: The name option cannot be changed after initialization. If you want to create a new
instance with a different name, please use "createInstance" api. #RUNTIME-010
```

**When it happens:** step 0, in `ModuleFederation.initOptions` (called by `init()`), when
the instance found for this build already has a different `name`.

**Why:** `init()` reuses the existing instance of the **same build** (matched by the bundler's
build identifier, or by name). Calling `init({ name: 'other' })` from code bundled into that build
tries to rename it. Typical causes: copy-pasted `init` calls with a different name, a library
that calls `init` itself, or two apps bundled together under one build id.

**Reproduce:**

```js
// inside an app built with the federation plugin (its instance is 'host')
import { init } from '@module-federation/runtime'
init({ name: 'dashboard', remotes: [] })   // → RUNTIME-010
```

(In plain Node without a build id, `init` with a new name silently creates a second instance
instead. Same bug, no error.)

**Fix:**

```js
// add remotes to the existing instance
import { registerRemotes } from '@module-federation/runtime'
registerRemotes([{ name: 'widget', type: 'module', entry: url }])

// or a separate, isolated instance
import { createInstance } from '@module-federation/runtime'
const widgets = createInstance({ name: 'dashboard', remotes: [/* … */] })
```

**Watch out for:** `name` must also be unique **across** apps on the page. Two remotes both
named `shellA` don't throw 010, they silently overwrite each other.

---

#### RUNTIME-011: The remoteEntry URL is missing from the remote snapshot

```
[ Federation Runtime ]: The remoteEntry URL is missing from the remote snapshot. #RUNTIME-011
args: {"remoteName":"shellA"}
```

**When it happens:** step 2→3, after the manifest/snapshot was read but it contains no
`remoteEntry` URL (`runtime-core/src/plugins/snapshot`).

**Why:** the remote's manifest was produced in a mode that has no runtime entry, e.g.
`experiments.hostProvidesAllShared` (import-map mode emits a manifest **without** `remoteEntry`),
or `metaData.remoteEntry` was stripped by `additionalData` or a deploy step.

**Fix:** build the remote with a normal `filename`, or switch the host to the same
import-map mode. Check the manifest:

```js
const m = await fetch('https://shell-a.example.com/mf-manifest.json').then((r) => r.json())
console.log(m.metaData?.remoteEntry)   // { name: 'remoteEntry.js', path: '', type: 'module' }
```

**Watch out for:** a manifest from one build and a `remoteEntry.js` from another (partial deploy).
Deploy each remote's `dist/` atomically.

---

#### RUNTIME-012: The getter for the shared module is not a function

```
The getter for the shared module is not a function. This may be caused by setting
"shared.import: false" without the host providing the corresponding lib. #RUNTIME-012
```

**When it happens:** step 6, when a container asks for a shared package that was configured
**without a local fallback** (`import: false`) and no other container on the page provided it.
(The check lives in the bundler runtime. In this Vite version a missing provider can also show
up as `loadShare` returning `false` and the import resolving to `undefined`.)

**Why:** with `import: false` the container promises "someone else will give me this package".
If that someone isn't loaded (a remote running **standalone**, or the providing host doesn't
list the package in its `shared`), there is nothing to call.

**Reproduce:**

```js
// remote
shared: { vue: { singleton: true, import: false } }
// open the remote standalone at http://localhost:8081 → no host provides vue
```

**Fix:**

```js
// 1. keep a fallback (default, what this repo does): remotes can run standalone
shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } }

// 2. or make sure the provider lists it too (host)
shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } }
```

**Watch out for:** `import: false` is only safe when the remote is **never** opened standalone
and the host **always** loads first. Silence its build warning only on purpose
(`suppressMissingImportWarning`).

---

#### RUNTIME-013: The manifest is not a valid Module Federation manifest

```
[ Federation Runtime ]: The manifest is not a valid Module Federation manifest. #RUNTIME-013
args: {"manifestUrl":"…/mf-manifest.json","moduleName":"shellA","hostName":"host","missingFields":"metaData,exposes,shared"}
```

**When it happens:** step 2, after the manifest downloaded and parsed as JSON, but it misses
`metaData`, `exposes` or `shared` (the `missingFields` arg tells you which).

**Why:** the URL returns some other JSON: `package.json`, a Vite `manifest.json`
(`build.manifest`, a different format), `mf-stats.json`, an API error object
(`{"message":"Unauthorized"}`), or a manifest from an incompatible tool.

**Fix:** point `entry` at the file named by the remote's `manifest.fileName` (default
`mf-manifest.json`), not at Vite's `.vite/manifest.json` or `mf-stats.json`. Check:

```js
const m = await fetch(url).then((r) => r.json())
console.log(Object.keys(m))   // id, name, metaData, shared, remotes, exposes
```

**Watch out for:** `manifest.additionalData` must return the **whole** manifest (spread the
original). Returning only your extra fields produces a 013.

---

#### RUNTIME-014: The remote does not expose the requested module

```
[ Federation Runtime ]: The remote does not expose the requested module. #RUNTIME-014
args: {"hostName":"host","remoteName":"shellA","remoteEntryUrl":"…/remoteEntry.js","expose":"./Cart","requestId":"shellA/Cart","availableExposes":["./App"]}
```

**When it happens:** step 5, `container.get('./Cart')` returned nothing.

**Why:**
- The key isn't in the remote's `exposes` (typo, case: `./app` vs `./App`).
- The remote deployed in this environment is **older/newer** than the code that imports it.
- The host's dev server still has an old remote cached.

**Diagnose:** `availableExposes` lists what the remote offers (when a snapshot is available).
Otherwise:

```js
const c = await import('http://localhost:8081/remoteEntry.js')
await c.init?.({})          // only for inspection in a scratch page
await c.get('./App')        // works → the expose exists; try './Cart'
```

**Fix:** align both sides. In this repo the keys live in `apps/shell-*/shared.federation.json`:

```json
"exposes": { "./App": "./src/expose/App.mjs", "./Cart": "./src/expose/Cart.mjs" }
```

```js
const Cart = defineRemoteComponent(() => import('shellA/Cart'))
```

**Watch out for:** removing or renaming an expose is a **breaking change** for every host.
Keep old keys as aliases for one release, and deploy remotes before hosts.

---

#### RUNTIME-015: Remote container initialization failed

```
[ Federation Runtime ]: Remote container initialization failed. #RUNTIME-015
args: {"hostName":"host","remoteName":"shellA","remoteEntryUrl":"…/remoteEntry.js","remoteEntryKey":"shellA","shareScope":"default"}
Original Error Message:
 Error: …the remote's own error…
```

**When it happens:** step 4, `remoteEntry.init(shareScope)` **threw**. The `Original Error Message`
is the remote's error.

**Why:**
- The remote's own federation setup failed while initialising: one of **its** remotes (here
  `host/ui-dev` for shell-a/shell-b) couldn't be loaded, so the error cascades.
- Shared dependency negotiation failed: `strictVersion: true` with an incompatible
  `requiredVersion` (e.g. remote wants `vue ^3.6`, host provides 3.5).
- Different `@module-federation/vite` / runtime versions between host and remote (different
  share scope formats).
- `shareScope` names don't match (`'default'` vs a custom scope).

**Diagnose:**
1. Read `Original Error Message`.
2. Open the remote **standalone** (`http://localhost:8081`). Its own console shows the root error.
3. Compare versions:

```bash
npm ls vue @module-federation/vite --all   # one version each across apps
```

```js
__FEDERATION__.__SHARE__   // which versions of vue each container registered
```

**Fix:**

```js
// same requirement everywhere, no strictVersion unless you need it
shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } }

// same share scope on both sides (default unless you have a reason)
shellA: { type: 'module', name: 'shellA', entry, shareScope: 'default' }
```

Keep one lockfile (npm workspaces) so every app resolves the same plugin and runtime versions.

**Watch out for:** a 015 in the **host** is often a 008 inside the **remote** (the remote
couldn't reach its own remote). Fix the inner error first.

---

### 7.5 One plugin to log every federation error with context

Use it in development to see every failure with the phase it happened in.

```js
// src/mf/error-reporter.mjs   →   runtimePlugins: ['./src/mf/error-reporter.mjs']
export default () => ({
  name: 'error-reporter',
  errorLoadRemote({ id, error, lifecycle, from }) {
    console.groupCollapsed(`%c[mf] ${id} failed in ${lifecycle} (${from})`, 'color:#c00')
    console.error(error)
    console.groupEnd()
    // send to your monitoring here
    // returning nothing re-throws; return a module to recover (see §6.4)
  },
  errorLoadShare({ pkgName, error }) {
    console.error(`[mf] shared "${pkgName}" failed`, error)
  },
  loadEntryError({ remoteInfo }) {
    console.warn(`[mf] entry failed for ${remoteInfo.name}: ${remoteInfo.entry}`)
  },
})
```

`lifecycle` values: `beforeRequest` (before matching, e.g. 004), `afterResolve` (manifest, e.g.
003/013), `onLoad` (entry, init, expose: 008/001/002/015/014), `beforeLoadShare` (shared deps).

### 7.6 Type and build codes

#### TYPE-001: Failed to generate type declaration

**Cause:** `dts` is enabled but there's no valid `tsconfig.json` (this repo is plain JS).
**Fix:** set `dts: false` (done in every app), or add a `tsconfig.json` if you move to TS.

#### BUILD-001: Failed to find expose module

**Cause:** an `exposes` value points to a file that doesn't exist.
**Fix:** paths are relative to the app root, e.g. `./src/expose/App.mjs`. Check the extension
(`.mjs` vs `.js`).

#### BUILD-002: PublicPath is required in prod mode

**Cause:** production build without a usable public path.
**Fix:** set an absolute Vite `base` (this repo: `VITE_PUBLIC_URL`) or the `publicPath` option.

---

## 8. Other errors you will meet (no code)

| Message | Cause | Fix |
| --- | --- | --- |
| `[Vue warn]: Invalid vnode type when creating vnode: undefined` in a remote | A component used a federated import (`host/ui-dev`) before it finished loading. | `await import('host/ui-dev')` in the exposed entry and in `main.mjs` (done in `src/expose/App.mjs`). |
| `Top-level await is not available in the configured target environment` | `build.target` too old for the runtime. | `build: { target: 'esnext' }`. |
| `Failed to resolve import "shellA/App"` (dev) | Remote not declared in `remotes`, or dev server not restarted after changing it. | Add it, restart `vite`. |
| `Expected a JavaScript module script but the server responded with a MIME type of "text/html"` | The entry URL hit the SPA fallback (`index.html`). | Wrong path/port for `remoteEntry.js`. |
| Remote renders **without styles** in production | CSS not attached to the expose. | `bundleAllCSS: true` in the remote. Keep global CSS out of remotes. |
| Host styles leak into / are overridden by a remote | Global selectors in a remote. | Scoped styles + a root class (`.shell-a`). |
| `provide/inject` or reactivity broken across apps; two Vue copies in Network tab | `vue` not shared as a singleton in one app. | `shared: { vue: { singleton: true } }` everywhere. |
| `Unsatisfied version x of shared singleton module vue (required ^y)` | Apps use different Vue majors/minors. | Align versions; widen `requiredVersion` if compatible. |
| Remote uses the **host's** Vuex store / axios defaults | `vuex` / `axios` shared, or bare `useStore()`. | Don't share them; use per-app store keys (`useShellAStore()`). |
| Chunks 404 like `http://localhost:8080/assets/App-xxx.js` for a remote | Remote built with relative `base`. | Absolute `base` (`VITE_PUBLIC_URL`) for remotes and the host. |
| Every remote's `remoteEntry.js` is fetched at startup, even unused ones | `shareStrategy: 'version-first'` (default). | `shareStrategy: 'loaded-first'`. |
| Old remote code after deploy | `remoteEntry.js` cached. | Serve it with `Cache-Control: no-cache`; hashed chunks can be immutable. |
| `Blocked request. This host ("x") is not allowed.` | Vite's DNS-rebinding protection. | Add the host to `VITE_ALLOWED_HOSTS`. |
| `GET http://localhost:5000/ 403 (Forbidden)` on macOS | macOS **AirPlay Receiver** listens on port 5000 (and 7000) and answers 403. | This repo uses 8080/8081/8082. Otherwise turn off System Settings → General → AirDrop & Handoff → AirPlay Receiver. |
| `Port 8081 is already in use` | `strictPort: true`. | Free the port or change `VITE_PORT` **and** the URLs that point to it. |
| `[app] missing env for mode "x"` | A required key is absent in `.env.x`. | Add it (see `.env.example`). |
| `[mock:host] invalid API gateway key for this app` (401) | `VITE_MOCK_GATEWAY_KEY` ≠ `VITE_API_GATEWAY_KEY` in that app's `.env.[mode]` (or a `.local` override). | Make them equal; run `npm run check:env`. |
| `[federation] "x" is shared but not in package.json` | `shared.federation.json` lists an uninstalled package. | Install it or remove it from `shared`. |

---

## 9. Debugging workflow

1. **Network tab, filter `remoteEntry`**: is each entry 200 and JavaScript?
2. **Console**: read the `#RUNTIME-0xx` code and its `args`, then look it up above.
3. **Open the remote standalone** (`http://localhost:8081`): if it fails there, it's the
   remote's bug, not federation.
4. **`globalThis.__FEDERATION__`** in the console: check registered remotes, share scope and
   which `vue` version was picked.
5. **Check env**: every app prints its resolved env on start (`env mode … remote:host …`).
6. **Clean caches**: `npm run clean`, then restart (removes `dist/` and `.__mf__temp`).

## 10. Production checklist

- [ ] Absolute `VITE_PUBLIC_URL` per app and environment
- [ ] `VITE_CORS_ORIGINS` lists every origin that loads the app (remotes ↔ host for `ui-dev`)
- [ ] `remoteEntry.js` served with `no-cache`; `assets/*` with long-lived caching
- [ ] HTTPS everywhere (no mixed content), CSP `script-src` includes remote origins
- [ ] Deploy order: remotes, then host. `ui-dev` and exposed APIs stay backward compatible
- [ ] `shareStrategy: 'loaded-first'`, `vue` singleton, nothing else shared unless required
- [ ] Error boundary for every remote (`defineRemoteComponent`), optional retry plugin
