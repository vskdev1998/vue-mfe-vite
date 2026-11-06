# How `vite.config.mjs` is built

Every app's config is plain ESM (`.mjs`, no TypeScript) and is driven by **two inputs**:

| Input | What it holds | Who has it |
| --- | --- | --- |
| `.env` + `.env.[mode]` | everything environment-specific: ports, URLs, CORS, sourcemaps, remote entry URLs | all apps |
| `shared.federation.json` | the federation **contract**: name, exposes, remotes (by env key), shared deps | **remotes only** (shell-a, shell-b) |

The host keeps its federation options inline in `vite.config.mjs`.

```
apps/shell-a/
├─ .env, .env.development, .env.localprod, .env.staging, .env.production, .env.example
├─ shared.federation.json
├─ config/
│  ├─ env.mjs          # readEnv(mode, root, extraKeys) + envBanner()
│  └─ federation.mjs   # shared.federation.json → @module-federation/vite options
└─ vite.config.mjs
```

## 1. `config/env.mjs`: load and validate `.env.[mode]`

```js
import { loadEnv } from 'vite'
const raw = loadEnv(mode, root, '')   // '' = every key, not only VITE_*
```

- `npm run dev` → mode `development` → `.env` + `.env.development` (+ `.local` overrides).
- `npm run build:staging` → `.env.staging`. `npm run preview` → `--mode localprod`.
- Required keys: `VITE_APP_NAME`, `VITE_PORT`, `VITE_PUBLIC_URL`, `VITE_API_BASE_URL`, plus every
  remote entry key (host: `VITE_SHELL_A_ENTRY`, `VITE_SHELL_B_ENTRY`; remotes: whatever
  `shared.federation.json` lists as `entryEnv`, i.e. `VITE_HOST_ENTRY`).
  Missing keys stop the dev server/build with a clear message.
- Returns typed values used by the config:

| Returned | From | Used for |
| --- | --- | --- |
| `port` | `VITE_PORT` | `server.port`, `preview.port` |
| `devHost` | `VITE_DEV_HOST` | `server.host`, `preview.host` |
| `open` | `VITE_OPEN` | `server.open` |
| `publicUrl` / `origin` | `VITE_PUBLIC_URL` | build `base`, dev `server.origin` |
| `corsOrigins` | `VITE_CORS_ORIGINS` | `server.cors` / `preview.cors` allow-list |
| `allowedHosts` | `VITE_ALLOWED_HOSTS` | `server.allowedHosts`, `preview.allowedHosts` (`true` = any host) |
| `buildEntry` | `VITE_BUILD_ENTRY` | `build.rollupOptions.input.main` (custom build entry, default `index.html`) |
| `outDir` | `VITE_OUT_DIR` | `build.outDir` |
| `assetsDir` | `VITE_ASSETS_DIR` | `build.assetsDir` + `entryFileNames` / `chunkFileNames` / `assetFileNames` prefix |
| `sourcemap` | `VITE_SOURCEMAP` | `build.sourcemap` |
| `dropConsole` | `VITE_DROP_CONSOLE` | `esbuild.pure` (console.log/debug) + `esbuild.drop` (debugger) |
| `appName`, `appEnv` | `VITE_APP_NAME`, `VITE_APP_ENV` | `define: { __APP_NAME__, __APP_ENV__ }` |
| `raw` | everything | remote entry URLs |

`envBanner()` is a 10-line plugin that prints the resolved values when Vite starts:

```
  env mode           development
      app            shell-a (development)
      url            http://localhost:8081/
      api            https://dummyjson.com
      remote:host    http://localhost:8080/remoteEntry.js
      sourcemap      true
```

## 2. `shared.federation.json` (remotes)

```json
{
  "name": "shellA",
  "filename": "remoteEntry.js",
  "exposes": { "./App": "./src/expose/App.mjs" },
  "remotes": { "host": { "type": "module", "entryEnv": "VITE_HOST_ENTRY" } },
  "shared": { "vue": { "singleton": true, "requiredVersion": "^3.5.0" } },
  "notShared": { "axios": "…", "vuex": "…" },
  "bundleAllCSS": true,
  "shareStrategy": "loaded-first"
}
```

- `remotes.<name>.entryEnv` names the env key that holds the URL, so the JSON is identical
  in every environment and the URL changes per `.env.[mode]`.
- `notShared` is documentation **and** a guard: `config/federation.mjs` throws if a package
  appears in both `shared` and `notShared`, or if a shared package isn't in `package.json`.

`config/federation.mjs` turns it into plugin options:

```js
federation(createFederationOptions(fed, env.raw, pkg))
// → { name, filename, exposes, remotes: { host: { type, name, entry: env.raw.VITE_HOST_ENTRY, … } },
//     shared, bundleAllCSS, shareStrategy, dts: false }
```

## 3. Host (`apps/host/vite.config.mjs`)

```js
const REMOTE_ENV = { shellA: 'VITE_SHELL_A_ENTRY', shellB: 'VITE_SHELL_B_ENTRY' }
const env = readEnv(mode, root, Object.values(REMOTE_ENV))
const remoteUrls = Object.fromEntries(Object.entries(REMOTE_ENV).map(([n, k]) => [n, env.raw[k]]))

federation({
  name: 'host',
  exposes: { './ui-dev': './src/ui-dev/index.mjs' },
  remotes: { shellA: { type: 'module', entry: remoteUrls.shellA, … }, shellB: { … } },
  shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } },
  bundleAllCSS: true,
  shareStrategy: 'loaded-first',
})
```

## 4. Allowed hosts and custom build entry

```js
server:  { allowedHosts: env.allowedHosts /* e.g. ['localhost', '127.0.0.1', '.localhost'] */ },
preview: { allowedHosts: env.allowedHosts },
build: {
  outDir: env.outDir,
  assetsDir: env.assetsDir,
  rollupOptions: {
    input: { main: resolve(root, env.buildEntry) },          // VITE_BUILD_ENTRY
    output: {
      entryFileNames: `${env.assetsDir}/[name]-[hash].js`,
      chunkFileNames: `${env.assetsDir}/[name]-[hash].js`,
      assetFileNames: `${env.assetsDir}/[name]-[hash][extname]`,
    },
  },
},
```

- **allowedHosts**: Vite rejects requests whose `Host` header isn't `localhost`/an IP
  (DNS-rebinding protection) with `403 Blocked request. This host is not allowed`. Add tunnel
  or LAN names here, e.g. `VITE_ALLOWED_HOSTS=localhost,.ngrok-free.app,myapp.local`.
  A leading dot allows all subdomains. `true` allows everything (avoid).
- **Custom build entry**: point `VITE_BUILD_ENTRY` at another HTML file (e.g. `index.prod.html`
  with different inline CSS or meta tags) without touching the config. `remoteEntry.js` is
  still emitted by the federation plugin next to it.
- **Ports are fixed**: host 8080, shell-a 8081, shell-b 8082 (`VITE_PORT`, `strictPort: true`).

## 5. No TypeScript

- All source and config files are `.mjs` / `.vue` with `<script setup>` in JavaScript.
- `unplugin-auto-import` and `unplugin-vue-components` run with `dts: false`, so no `.d.ts`
  files are generated.
- `jsconfig.json` in each app gives editors the `@/*` alias and ESM resolution; it does not
  type-check (`checkJs: false`).
- Federated type generation is off (`dts: false` in the federation options).

## 6. Why `.mjs`

`.mjs` is always ESM in Node, independent of `"type"` in `package.json`, so config files,
scripts (`scripts/build-docs.mjs`) and source files all share one unambiguous module format.
Vite resolves `.mjs` by default (`resolve.extensions` starts with `.mjs`), so imports can stay
extension-less: `import { http } from './http'` finds `http.mjs`.
