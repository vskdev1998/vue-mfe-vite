# Shell B (`@mfe/shell-b`) · port 5002

Remote micro-frontend: **task board**. It exposes `./App` through Module Federation and
can also run standalone.

## Run

```bash
npm run dev -w @mfe/shell-b      # standalone at http://localhost:5002
npm run dev                  # from the repo root: host + both remotes
```

Inside the host it is mounted at `/shell-b`.

## Public API (what the host can rely on)

| Item | Value |
| --- | --- |
| Federation name | `shellB` |
| Remote entry | `<VITE_PUBLIC_URL>remoteEntry.js` (dev: http://localhost:5002/remoteEntry.js) |
| Exposed module | `./App` → `src/App.vue` (host: `import('shellB/App')`) |
| Props | `user` (object, optional), `standalone` (boolean) |
| Events published | `mfe:tasks-updated` → `{ open, total }` |
| Reads | `sessionStorage['mfe.auth']` (token for its axios instance) |

Keep this surface small and backwards compatible: the host and this remote deploy independently.

## Internals

| Concern | Where |
| --- | --- |
| Add / toggle / delete tasks, progress bar | `src/components/AddTaskForm.vue`, `TaskList.vue`, `TaskItem.vue` |
| Filters (all / open / done) | `src/components/TaskFilters.vue` |
| Own Vuex store + key `shellBStoreKey` (modules: `tasks`) | `src/store/`, provided in `src/App.vue` |
| Store accessor (auto-imported) | `src/composables/` |
| Own axios instance → https://jsonplaceholder.typicode.com | `src/services/http.js` |
| Offline fixtures (network fallback / `VITE_USE_MOCK_API=true`) | `src/services/fixtures/` |
| Event bus (own copy) | `src/utils/mfeBus.js` |
| Sass tokens | `src/styles/_tokens.scss` |
| Standalone bootstrap | `src/main.js` (never runs inside the host) |
| Inline critical CSS + standalone layout | `index.html` (never loaded by the host) |

### Why the store is `provide`d in App.vue

Inside the host, this component renders in the **host's** Vue app. A bare `useStore()`
would not find this remote's store. `provide(shellBStoreKey, store)` in the root and
`useStore(shellBStoreKey)` in children keep the store private and identical in both modes.

### CSS rules for remotes

`bundleAllCSS: true` ships every CSS file this remote imports together with `./App`.
So: scoped styles only, a root class (`.shell-b`) on the root element, and no global selectors
(`body`, `#app`) in `.vue`/`.scss` files. Standalone-only styles go inline in `index.html`.

## Env files

| File | `VITE_PUBLIC_URL` |
| --- | --- |
| `.env.development` | http://localhost:5002/ |
| `.env.localprod` | http://localhost:5002/ |
| `.env.staging` | https://shell-b.staging.example.com/ |
| `.env.production` | https://shell-b.example.com/ |

`VITE_PUBLIC_URL` becomes `server.origin` in dev and `base` in builds. See
[docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md).

## Migrating this remote from webpack

| Before (webpack 5) | After (this app) |
| --- | --- |
| `new ModuleFederationPlugin({ name: 'shellB', filename: 'remoteEntry.js', exposes: { './App': './src/App.vue' } })` | `federation({ name: 'shellB', filename: 'remoteEntry.js', exposes: { './App': './src/App.vue' }, bundleAllCSS: true })` |
| `output.publicPath: 'http://localhost:5002/'` (or `'auto'`) | `base: command === 'build' ? env.VITE_PUBLIC_URL : '/'` + `server.origin` |
| `devServer.headers: { 'Access-Control-Allow-Origin': '*' }` | `server.cors: true`, `preview.cors: true` |
| `main.js` → `import('./bootstrap')` | Plain `main.js` |
| `shared: { vue, vuex, axios }` | `shared: { vue }` only; private Vuex + axios |
| `MiniCssExtractPlugin` + style-loader | Built-in CSS + `bundleAllCSS` |
| `VUE_APP_API_URL` | `VITE_API_BASE_URL` |

While the host is still on webpack, add `varFilename: 'varRemoteEntry.js'` here and point the
webpack host at `shellB@http://localhost:5002/varRemoteEntry.js`.

Full guide: [docs/WEBPACK_TO_VITE_MIGRATION.md](../../docs/WEBPACK_TO_VITE_MIGRATION.md).
