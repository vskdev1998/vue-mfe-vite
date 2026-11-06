# Shell A (`@mfe/shell-a`) · port 8081

Remote micro-frontend: **product catalog + cart**. It exposes `./App` through Module Federation and
can also run standalone.

## Run

```bash
npm run dev -w @mfe/shell-a      # standalone at http://localhost:8081
npm run dev                  # from the repo root: host + both remotes
```

Inside the host it is mounted at `/shell-a`.

## Public API (what the host can rely on)

| Item | Value |
| --- | --- |
| Federation name | `shellA` |
| Remote entry | `<VITE_PUBLIC_URL>remoteEntry.js` (dev: http://localhost:8081/remoteEntry.js) |
| Exposed module | `./App` → `src/expose/App.mjs` → `src/App.vue` (host: `import('shellA/App')`) |
| Consumes | `host/ui-dev` (shared UI components) from `VITE_HOST_ENTRY` |
| Props | `user` (object, optional), `standalone` (boolean) |
| Events published | `mfe:cart-updated` → `{ count, items[] }` |
| Reads | `sessionStorage['mfe.auth']` (token for its axios instance) |

Keep this surface small and backwards compatible: the host and this remote deploy independently.

## Internals

| Concern | Where |
| --- | --- |
| Product search (debounced) + grid | `src/components/SearchBar.vue`, `ProductGrid.vue`, `ProductCard.vue` |
| Cart panel | `src/components/CartPanel.vue` |
| Own Vuex store + key `shellAStoreKey` (modules: `catalog`, `cart`) | `src/store/`, provided in `src/App.vue` |
| Store accessor (auto-imported) | `src/composables/` |
| Own axios instance → https://dummyjson.com | `src/services/http.mjs` |
| Offline fixtures (network fallback / `VITE_USE_MOCK_API=true`) | `src/services/fixtures/` |
| Federation contract | `shared.federation.json` → `config/federation.mjs` |
| Env loader for `vite.config.mjs` | `config/env.mjs` |
| UI components (`<Ui*>`, no imports) | resolved to `host/ui-dev` by `UiDevResolver` in `vite.config.mjs` |
| Event bus (own copy) | `src/utils/mfeBus.mjs` |
| Sass tokens | `src/styles/_tokens.scss` |
| Standalone bootstrap | `src/main.mjs` (never runs inside the host) |
| Inline critical CSS + standalone layout | `index.html` (never loaded by the host) |

### shared.federation.json

This remote's federation options live in `shared.federation.json`, not in `vite.config.mjs`:

```json
{
  "name": "shellA",
  "exposes": { "./App": "./src/expose/App.mjs" },
  "remotes": { "host": { "type": "module", "entryEnv": "VITE_HOST_ENTRY" } },
  "shared": { "vue": { "singleton": true, "requiredVersion": "^3.5.0" } },
  "notShared": { "axios": "…", "vuex": "…" },
  "bundleAllCSS": true,
  "shareStrategy": "loaded-first"
}
```

`entryEnv` names the `.env.[mode]` key holding the URL, so this file is the same in every
environment. See [docs/VITE_CONFIG.md](../../VITE_CONFIG.md).

### Using the host's ui-dev components

Write `<UiButton>`, `<UiCard>`, `<UiInput>`, `<UiBadge>`, `<UiSpinner>`, `<UiAlert>` with no
import. `UiDevResolver` turns them into `import { UiButton } from 'host/ui-dev'`. The theme
comes from CSS variables on the root (`.shell-a { --ui-primary: … }` in `src/App.vue`).
`src/expose/App.mjs` and `src/main.mjs` both `await import('host/ui-dev')` first.
**Standalone mode needs the host running** on :8080.
See [docs/UI_DEV_LIBRARY.md](../../UI_DEV_LIBRARY.md).

### Why the store is `provide`d in App.vue

Inside the host, this component renders in the **host's** Vue app. A bare `useStore()`
would not find this remote's store. `provide(shellAStoreKey, store)` in the root and
`useStore(shellAStoreKey)` in children keep the store private and identical in both modes.

### CSS rules for remotes

`bundleAllCSS: true` ships every CSS file this remote imports together with `./App`.
So: scoped styles only, a root class (`.shell-a`) on the root element, and no global selectors
(`body`, `#app`) in `.vue`/`.scss` files. Standalone-only styles go inline in `index.html`.

## API gateway key + mock API

This app's axios instance (`src/services/http.mjs`) sends `x-api-gateway-key: $VITE_API_GATEWAY_KEY` on every request. The key is unique to **shell-a** and to each `.env.[mode]`. The mock API (`src/services/mock/`) serves `GET /products`, `GET /products/search` and returns 401 unless the header equals `VITE_MOCK_GATEWAY_KEY`. Run `npm run check:env` at the root to verify. Details: [ENVIRONMENTS.md](../../ENVIRONMENTS.md#api-gateway-keys-and-the-mock-api).

## Env files

| File | `VITE_PUBLIC_URL` |
| --- | --- |
| `.env.development` | http://localhost:8081/ |
| `.env.localprod` | http://localhost:8081/ |
| `.env.staging` | https://shell-a.staging.example.com/ |
| `.env.production` | https://shell-a.example.com/ |

`VITE_PUBLIC_URL` becomes `server.origin` in dev and `base` in builds. See
[docs/ENVIRONMENTS.md](../../ENVIRONMENTS.md).

## Migrating this remote from webpack

| Before (webpack 5) | After (this app) |
| --- | --- |
| `new ModuleFederationPlugin({ name: 'shellA', exposes: { './App': './src/App.vue' }, remotes: { host: 'host@…' } })` in `webpack.config.js` | `shared.federation.json` (same fields, remote URL via `entryEnv`) → `federation(createFederationOptions(json, env.raw, pkg))` |
| Shared UI kit as an npm package / `shared: { '@acme/ui': … }` | `host/ui-dev` federated module + `UiDevResolver` |
| `output.publicPath: 'http://localhost:8081/'` (or `'auto'`) | `base: command === 'build' ? env.VITE_PUBLIC_URL : '/'` + `server.origin` |
| `devServer.headers: { 'Access-Control-Allow-Origin': '*' }` | `server.cors: true`, `preview.cors: true` |
| `main.js` → `import('./bootstrap')` | Plain `main.mjs` |
| `shared: { vue, vuex, axios }` | `shared: { vue }` only; private Vuex + axios |
| `MiniCssExtractPlugin` + style-loader | Built-in CSS + `bundleAllCSS` |
| `VUE_APP_API_URL` | `VITE_API_BASE_URL` |

While the host is still on webpack, add `varFilename: 'varRemoteEntry.js'` here and point the
webpack host at `shellA@http://localhost:8081/varRemoteEntry.js`.

Full guide: [docs/WEBPACK_TO_VITE_MIGRATION.md](../../WEBPACK_TO_VITE_MIGRATION.md).
