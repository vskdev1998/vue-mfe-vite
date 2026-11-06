# Environments & env files

Every app has the same set of files:

| File | Loaded when | Purpose |
| --- | --- | --- |
| `.env` | always | Values common to all modes (name, title, port, timeout) |
| `.env.development` | `vite` / `npm run dev` | Local dev servers, localhost remote URLs |
| `.env.localprod` | `vite build --mode localprod` | Production bundles that still point at localhost (for `vite preview`) |
| `.env.staging` | `vite build --mode staging` | Staging domains / CDN |
| `.env.production` | `vite build` | Production domains / CDN |
| `.env.example` | never (documentation) | Every variable with a comment |
| `.env.[mode].local` | that mode, on your machine | Personal overrides, git-ignored |

Priority (later wins): `.env` < `.env.local` < `.env.[mode]` < `.env.[mode].local` < real
shell environment variables.

> Only variables prefixed with `VITE_` reach browser code (`import.meta.env.VITE_*`).
> Never put secrets in these files: everything `VITE_*` ends up in the JS bundle.

All values are loaded by each app's `config/env.mjs` and used in `vite.config.mjs`
(see [How vite.config.mjs is built](VITE_CONFIG.md)).

## Variables used by every app

| Variable | development | localprod | staging | production | Used for |
| --- | --- | --- | --- | --- | --- |
| `VITE_APP_NAME` | (in `.env`) | | | | `X-Client-App` header, `__APP_NAME__` |
| `VITE_PORT` | 8080 / 8081 / 8082 (in `.env`) | | | | `server.port`, `preview.port` |
| `VITE_DEV_HOST` | localhost (in `.env`) | | | | `server.host` |
| `VITE_APP_ENV` | development | localprod | staging | production | `__APP_ENV__` |
| `VITE_PUBLIC_URL` | http://localhost:500x/ | http://localhost:500x/ | https://…staging.example.com/ | https://….example.com/ | dev `server.origin`, build `base` |
| `VITE_OPEN` | false | false | false | false | `server.open` |
| `VITE_SOURCEMAP` | true | true | true | false | `build.sourcemap` |
| `VITE_DROP_CONSOLE` | false | true | false | true | strip `console.log/debug` + `debugger` |
| `VITE_CORS_ORIGINS` | see below | | | | `server.cors` / `preview.cors` |
| `VITE_ALLOWED_HOSTS` | localhost,127.0.0.1,.localhost | same | .staging.example.com | .example.com | `server/preview.allowedHosts` |
| `VITE_BUILD_ENTRY` | index.html | index.html | index.html | index.html | custom build entry (`rollupOptions.input`) |
| `VITE_OUT_DIR` / `VITE_ASSETS_DIR` | dist / assets | | | | `build.outDir` / `build.assetsDir` |
| `VITE_API_TIMEOUT` | 10000 host / 8000 remotes (in `.env`) | | | | axios timeout |

## Host (`apps/host`)

| Variable | development / localprod | staging | production |
| --- | --- | --- | --- |
| `VITE_PUBLIC_URL` | http://localhost:8080/ | https://staging.example.com/ | https://app.example.com/ |
| `VITE_CORS_ORIGINS` (who may load `host/ui-dev`) | http://localhost:8081,http://localhost:8082 | https://shell-a.staging.example.com,https://shell-b.staging.example.com | https://shell-a.example.com,https://shell-b.example.com |
| `VITE_SHELL_A_ENTRY` | http://localhost:8081/remoteEntry.js | https://shell-a.staging.example.com/remoteEntry.js | https://shell-a.example.com/remoteEntry.js |
| `VITE_SHELL_B_ENTRY` | http://localhost:8082/remoteEntry.js | https://shell-b.staging.example.com/remoteEntry.js | https://shell-b.example.com/remoteEntry.js |
| `VITE_API_BASE_URL` | https://dummyjson.com | https://api.staging.example.com | https://api.example.com |
| `VITE_USE_MOCK_AUTH` | true | false | false |

`config/env.mjs` **stops the dev server or build** if `VITE_SHELL_A_ENTRY` / `VITE_SHELL_B_ENTRY`
(or any required key) is missing for the current mode.

## Remotes (`apps/shell-a`, `apps/shell-b`)

| Variable | development / localprod | staging | production |
| --- | --- | --- | --- |
| `VITE_PUBLIC_URL` | http://localhost:500x/ | https://shell-x.staging.example.com/ | https://shell-x.example.com/ |
| `VITE_CORS_ORIGINS` (who may load this remote) | http://localhost:8080 | https://staging.example.com | https://app.example.com |
| `VITE_HOST_URL` | http://localhost:8080/ | https://staging.example.com/ | https://app.example.com/ |
| `VITE_HOST_ENTRY` (where `host/ui-dev` comes from) | http://localhost:8080/remoteEntry.js | https://staging.example.com/remoteEntry.js | https://app.example.com/remoteEntry.js |
| `VITE_API_BASE_URL` | dummyjson (A) / jsonplaceholder (B) | same | same |
| `VITE_USE_MOCK_API` | false | false | false |

`VITE_HOST_ENTRY` is the env key named in `shared.federation.json` → `remotes.host.entryEnv`.

`VITE_PUBLIC_URL` is the most important remote variable:

- **dev**: becomes `server.origin`, so the remote's dev assets are requested from `:8081`
  even though the page is the host on `:8080`.
- **build**: becomes Vite's `base`. `remoteEntry.js` imports its chunks relative to this URL.
  If it's wrong, the host loads `remoteEntry.js` and then 404s on every chunk.

The host also uses an absolute `base` in builds, because it is a remote too (it serves `ui-dev`).

## `npm run preview` uses `localprod`

`vite preview` defaults to mode `production`, which would load the `example.com` URLs and
CORS lists. Every app's `preview` script is therefore `vite preview --mode localprod`, which
matches `npm run build:localprod` (and `npm run start` runs both).

## API gateway keys and the mock API

Every app sends **its own** API gateway key on **every** request, from its own axios instance:

```js
// apps/*/src/services/http.mjs
axios.create({
  headers: { [GATEWAY_HEADER]: GATEWAY_KEY },   // x-api-gateway-key: gw_shella_dev_…
})
```

| App | development | localprod | staging | production |
| --- | --- | --- | --- | --- |
| host | `gw_host_dev_…` | `gw_host_lp_…` | `gw_host_stg_…` | `gw_host_prod_…` |
| shell-a | `gw_shella_dev_…` | `gw_shella_lp_…` | `gw_shella_stg_…` | `gw_shella_prod_…` |
| shell-b | `gw_shellb_dev_…` | `gw_shellb_lp_…` | `gw_shellb_stg_…` | `gw_shellb_prod_…` |

| Variable | Meaning |
| --- | --- |
| `VITE_API_GATEWAY_HEADER` | Header name (`x-api-gateway-key`) |
| `VITE_API_GATEWAY_KEY` | This app's key for this environment. Different per app **and** per mode |
| `VITE_MOCK_GATEWAY_KEY` | The key the built-in mock API accepts. Must equal `VITE_API_GATEWAY_KEY` |

> These keys **identify the calling app**; they are not secrets. Every `VITE_*` value is
> compiled into the browser bundle. Real secrets belong on the server / gateway.

### Mock API verification

The mock API is an **axios adapter** (`src/services/mock/adapter.mjs`), so mock requests go
through the same axios instance, interceptors and headers as real ones. Before routing, it
checks the gateway key like a real gateway would:

| Request header | Result |
| --- | --- |
| missing | `401 [mock:<app>] missing x-api-gateway-key header` |
| ≠ `VITE_MOCK_GATEWAY_KEY` | `401 [mock:<app>] invalid API gateway key for this app` |
| matches | the route handler runs (`src/services/mock/routes.mjs`) |

Where the mock is used:

| App | When | Routes |
| --- | --- | --- |
| host | `VITE_USE_MOCK_AUTH=true` (login) | `POST /auth/login` (demo / demo123, guest / guest123) |
| shell-a | `VITE_USE_MOCK_API=true`, or the real API is unreachable | `GET /products`, `GET /products/search` |
| shell-b | `VITE_USE_MOCK_API=true`, or the real API is unreachable | `GET /todos`, `POST /todos` |

Try the 401: put `VITE_MOCK_GATEWAY_KEY=wrong` in `apps/host/.env.development.local`, restart,
and sign in. The login card shows `[mock:host] invalid API gateway key for this app`.

### Verifying all env files: `npm run check:env`

`scripts/check-env.mjs` loads every app × mode and fails (exit 1) when:

- a required key is missing (incl. `VITE_API_GATEWAY_*`, `VITE_MOCK_GATEWAY_KEY`)
- two apps share a gateway key in the same mode, or one app reuses a key across modes
- `VITE_MOCK_GATEWAY_KEY ≠ VITE_API_GATEWAY_KEY`
- a key doesn't match `gw_<app>_<env>_<16 hex>`, or a URL isn't absolute

It runs automatically before `npm run dev` and `npm run build` (`predev` / `prebuild`), and
prints a table of app, mode, port, masked key and mock status. Each app's
`config/env.mjs` also prints the masked key on start and warns on a mismatch.

## Deploying to real environments

1. Replace `example.com` URLs in `.env.staging` / `.env.production` of all three apps.
2. Build and deploy the **remotes first** (`npm run build:staging -w @mfe/shell-a`, …).
3. Build and deploy the host. Changes to `ui-dev` must stay backwards compatible, because the already-deployed remotes load it from the host.
4. Every app must send CORS headers for the apps that load it (remotes → host origin, host → remote origins for `ui-dev`; see `VITE_CORS_ORIGINS`) for `remoteEntry.js` and chunks
   (`Access-Control-Allow-Origin`), or all apps can be served from the same domain under different paths,
   e.g. `https://app.example.com/mfe/shell-a/` (then use that as `VITE_PUBLIC_URL`).
5. Serve `remoteEntry.js` with `Cache-Control: no-cache`; hashed chunks can be cached forever.

### Overriding at build time from CI

```bash
VITE_SHELL_A_ENTRY=https://cdn.acme.io/shell-a/1.4.2/remoteEntry.js npm run build -w @mfe/host
```

Shell variables take priority over every `.env*` file.
