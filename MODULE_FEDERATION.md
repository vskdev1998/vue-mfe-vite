# Module Federation: complete developer guide

Everything you need to set up, configure, extend and debug Module Federation in this repo:
concepts, a from-scratch setup, **every plugin option**, copy-paste snippets, and a fix for
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
| `runtimePlugins` | `Array<string \| [string, options]>` | `[]` | Paths to runtime plugins (hooks around loading, see §5.4). | – |
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

## 4. Dev vs build

| Concern | `vite` (dev) | `vite build` + `vite preview` |
| --- | --- | --- |
| remoteEntry | served by the dev server, modules on demand | static file in `dist/` |
| Asset URLs | `server.origin` must be absolute (`http://localhost:8081`) | `base` must be absolute (`VITE_PUBLIC_URL`) |
| CSS | injected by JS (HMR) | `bundleAllCSS: true` injects it with the expose |
| HMR | works inside each app; editing a remote reloads it in the host | – |
| Mode / env | `.env.development` | `.env.[mode]` (`preview` here uses `--mode localprod`) |

---

## 5. Snippets

### 5.1 Safe remote component with loading/error states (in repo)

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

### 5.2 Wait for a federated dependency before rendering (in repo)

```js
// apps/shell-a/src/expose/App.mjs
await import('host/ui-dev')          // top-level await: host waits for this
export { default } from '../App.vue'
```

### 5.3 Environment-specific remote URLs (in repo)

```json
// shared.federation.json
"remotes": { "host": { "type": "module", "entryEnv": "VITE_HOST_ENTRY" } }
```

```bash
# .env.production
VITE_HOST_ENTRY=https://app.example.com/remoteEntry.js
```

### 5.4 Runtime plugin: log + fallback when a remote fails

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

### 5.5 Retry flaky remote entries

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

### 5.6 Register remotes at runtime (URL known only at runtime)

```js
// needs: npm i @module-federation/runtime  (same major as the plugin's runtime)
import { getInstance } from '@module-federation/runtime'

const mf = getInstance()
mf.registerRemotes([
  { name: 'shellC', entry: `${window.APP_CONFIG.shellCUrl}/remoteEntry.js`, type: 'module' },
])
const mod = await mf.loadRemote('shellC/App')
```

### 5.7 Expose more than a component

```json
"exposes": {
  "./App": "./src/expose/App.mjs",
  "./routes": "./src/expose/routes.mjs",
  "./useCart": "./src/composables/useCart.mjs"
}
```

Keep exposed APIs small and backward compatible. Don't expose a Vuex store instance unless
consumers really need its state; events (`mfe:*`) are looser coupling.

### 5.8 Preload a remote before navigation

```js
router.beforeEach((to) => {
  if (to.name === 'shell-a') import('shellA/App') // warm the cache, don't await
})
```

### 5.9 Use a webpack remote from this Vite host

```js
remotes: {
  legacy: { type: 'var', name: 'legacy', entry: 'https://legacy.example.com/remoteEntry.js', entryGlobalName: 'legacy' },
}
```

And to let a **webpack host** consume a Vite remote, add `varFilename: 'varRemoteEntry.js'` to
the remote and point the webpack host at `shellA@https://…/varRemoteEntry.js`.

### 5.10 Emit a manifest and load by manifest

```js
// remote
federation({ name: 'shellA', manifest: true, /* … */ })   // emits dist/mf-manifest.json
// host
remotes: { shellA: { type: 'module', name: 'shellA', entry: 'https://shell-a.example.com/mf-manifest.json' } }
```

### 5.11 Inspect the runtime in the browser console

```js
globalThis.__FEDERATION__                 // all runtime instances, share scopes, loaded remotes
globalThis.__FEDERATION__.__INSTANCES__   // one per container on the page
```

The **Module Federation DevTools** Chrome extension shows the dependency graph and lets you
point a remote at a different URL (e.g. your local dev server) on a deployed page.

---

## 6. Error reference: every coded error

Runtime errors look like:

```
[ Federation Runtime ]: Failed to load script resources. #RUNTIME-008
args: {"remoteName":"…","resourceUrl":"http://localhost:8080/remoteEntry.js"}
View the docs to see how to solve: https://module-federation.io/guide/troubleshooting/runtime#runtime-008
```

Read `args`: it names the remote and the URL that failed.

### RUNTIME-001: Failed to get remoteEntry exports

**Cause:** `remoteEntry.js` loaded, but didn't export a container (`get`/`init`). Usually the
URL returns something else: the host's `index.html` (SPA fallback), a 404 page, or a `var`
entry loaded as `type: 'module'`.
**Fix:**
1. Open the `entry` URL directly in the browser and check it's JavaScript.
2. Match the `type`: Vite remotes are `'module'`, webpack/rspack are `'var'`.
3. Check `filename` in the remote equals the file name in the host's URL.

### RUNTIME-002: The remote entry interface does not contain "init"

**Cause:** the loaded file isn't a federation container, or two different runtimes are mixed
(very old webpack MF 1 container without `init`, or a wrong `entryGlobalName`).
**Fix:** for `var` remotes make `entryGlobalName` equal the remote's `name`. Rebuild the remote
with a current plugin. Don't point `entry` at a regular app bundle.

### RUNTIME-003: Failed to get manifest

**Cause:** `entry` ends in `.json` (manifest mode) and the fetch failed or returned non-JSON.
**Fix:** enable `manifest: true` in the remote, deploy `mf-manifest.json`, check CORS and the URL.
Or point `entry` at `remoteEntry.js` instead.

### RUNTIME-004: Failed to locate remote

**Cause:** `import('shellX/App')` (or `loadRemote`) uses a remote name that isn't registered.
Typo, or the remote was not added to `remotes`.
**Fix:** the prefix before `/` must equal a key in `remotes`. Restart the dev server after
changing `remotes`.

### RUNTIME-005: Invalid loadShareSync function call from bundler runtime

**Cause:** a shared module was needed synchronously (at module evaluation time) before the
share scope was ready. Typical with `eager` mismatches or code that reads a shared lib in a
top-level statement of the entry.
**Fix:** keep the share async (no `eager`), or make the consumer `await` something first.
Ensure the host init script runs before the entry (`hostInitInjectLocation: 'html'`).

### RUNTIME-006: Invalid loadShareSync function call from runtime

**Cause:** same as 005, but triggered through the runtime API (`loadShareSync`).
**Fix:** use `await loadShare(...)`, or provide the dependency eagerly in the host.

### RUNTIME-007: Failed to get remote snapshot

**Cause:** manifest/snapshot mode couldn't resolve the remote's snapshot (manifest unreachable,
or DevTools override pointing to a dead URL).
**Fix:** check the manifest URL, clear Module Federation DevTools overrides, or set
`disableSnapshot` only if you never use manifests.

### RUNTIME-008: Failed to load script resources

**The most common one.** The browser couldn't load `remoteEntry.js` or a chunk.

| Cause | How to see it | Fix in this repo |
| --- | --- | --- |
| Remote not running | Network tab: `ERR_CONNECTION_REFUSED` | `npm run dev` at the root (starts all three) |
| CORS | Console: `blocked by CORS policy` | Add the loading page's origin to the remote's `VITE_CORS_ORIGINS` |
| Wrong URL | 404 on `remoteEntry.js` | Fix `VITE_SHELL_*_ENTRY` / `VITE_HOST_ENTRY` in `.env.[mode]` |
| Preview using production URLs | requests to `example.com` | Use `npm run preview` (runs `--mode localprod`) |
| Mixed content | HTTPS page loading HTTP remote | Serve remotes over HTTPS |
| CSP | `Refused to load the script` | Allow remote origins in `script-src` |
| Blocked host | 403 `Blocked request. This host is not allowed` | Add it to `VITE_ALLOWED_HOSTS` |
| macOS AirPlay on :5000 | 403 with no Vite page | Don't use port 5000 on macOS (this repo uses 8080–8082) |
| Standalone remote, host down | `:8080/remoteEntry.js` fails from `:8081` | Start the host (remotes need `host/ui-dev`) |

### RUNTIME-009: Please call createInstance first

**Cause:** runtime API (`loadRemote`, `registerRemotes`) used before the federation instance
exists, often in code that runs before the host init script, or from a second copy of
`@module-federation/runtime`.
**Fix:** call it after app start, use `getInstance()`, and make sure only one runtime package
version is installed (`npm ls @module-federation/runtime`).

### RUNTIME-010: The name option cannot be changed after initialization

**Cause:** `init()` / `createInstance()` called again with a different `name`.
**Fix:** keep one instance per container. For a separate one, use `createInstance({ name })`.

### RUNTIME-011: The remoteEntry URL is missing from the remote snapshot

**Cause:** manifest exists but has no `remoteEntry` (the remote was built with
`experiments.hostProvidesAllShared` or a broken manifest).
**Fix:** rebuild the remote with a normal `filename`, or use the matching host mode.

### RUNTIME-012: The getter for the shared module is not a function

**Cause:** a share is configured with `import: false` (no local fallback) and nobody provided
it at runtime, e.g. a remote running standalone while expecting the host's copy.
**Fix:** remove `import: false`, or make sure the providing container loads first. In this
repo `vue` keeps a local fallback, so remotes run standalone.

### RUNTIME-013: The manifest is not a valid Module Federation manifest

**Cause:** the `.json` at `entry` isn't an `mf-manifest.json` (wrong file, HTML error page,
or an old format).
**Fix:** point to the real manifest from a current build, or to `remoteEntry.js`.

### RUNTIME-014: The remote does not expose the requested module

**Cause:** `import('shellA/Foo')` but `exposes` has no `./Foo`. Or the remote was redeployed
without it.
**Fix:** compare the path after the remote name with the keys in `exposes`
(`shared.federation.json`). Keys need the leading `./`, imports don't.

### RUNTIME-015: Remote container initialization failed

**Cause:** the remote's `init()` threw: its own share scope negotiation failed, a top-level
error in an exposed module's dependencies, or an incompatible runtime version.
**Fix:** open the remote standalone to see its own error. Align `@module-federation/vite`
versions across apps. Check `requiredVersion`/`strictVersion` of shared deps.

### TYPE-001: Failed to generate type declaration

**Cause:** `dts` is enabled but there's no valid `tsconfig.json` (this repo is plain JS).
**Fix:** set `dts: false` (done in every app), or add a `tsconfig.json` if you move to TS.

### BUILD-001: Failed to find expose module

**Cause:** an `exposes` value points to a file that doesn't exist.
**Fix:** paths are relative to the app root, e.g. `./src/expose/App.mjs`. Check the extension
(`.mjs` vs `.js`).

### BUILD-002: PublicPath is required in prod mode

**Cause:** production build without a usable public path.
**Fix:** set an absolute Vite `base` (this repo: `VITE_PUBLIC_URL`) or the `publicPath` option.

---

## 7. Other errors you will meet (no code)

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

## 8. Debugging workflow

1. **Network tab, filter `remoteEntry`**: is each entry 200 and JavaScript?
2. **Console**: read the `#RUNTIME-0xx` code and its `args`, then look it up above.
3. **Open the remote standalone** (`http://localhost:8081`): if it fails there, it's the
   remote's bug, not federation.
4. **`globalThis.__FEDERATION__`** in the console: check registered remotes, share scope and
   which `vue` version was picked.
5. **Check env**: every app prints its resolved env on start (`env mode … remote:host …`).
6. **Clean caches**: `npm run clean`, then restart (removes `dist/` and `.__mf__temp`).

## 9. Production checklist

- [ ] Absolute `VITE_PUBLIC_URL` per app and environment
- [ ] `VITE_CORS_ORIGINS` lists every origin that loads the app (remotes ↔ host for `ui-dev`)
- [ ] `remoteEntry.js` served with `no-cache`; `assets/*` with long-lived caching
- [ ] HTTPS everywhere (no mixed content), CSP `script-src` includes remote origins
- [ ] Deploy order: remotes, then host. `ui-dev` and exposed APIs stay backward compatible
- [ ] `shareStrategy: 'loaded-first'`, `vue` singleton, nothing else shared unless required
- [ ] Error boundary for every remote (`defineRemoteComponent`), optional retry plugin
