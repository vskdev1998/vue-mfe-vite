# Host app (`@mfe/host`) · port 5000

The container application. It owns the URL, the **login**, the layout and the header, and
loads the two remote micro-frontends at runtime with Module Federation.

## Run

```bash
# from the repo root (starts all three apps; the host needs the remotes)
npm run dev
# host only
npm run dev -w @mfe/host
```

Open http://localhost:5000 → you're redirected to `/login`. Sign in with `demo / demo123`.

## Features

| Feature | Where |
| --- | --- |
| Sample login (mock or dummyjson) | `src/views/LoginView.vue`, `src/store/modules/auth.mjs`, `src/services/authService.mjs` |
| Route guard (`requiresAuth`, `guestOnly`) | `src/router/index.mjs` |
| Own Vuex store + key `hostStoreKey` | `src/store/index.mjs`, `src/composables/useHostStore.mjs` |
| Own axios instance | `src/services/http.mjs` |
| Loading remotes safely | `src/utils/defineRemoteComponent.mjs`, `src/components/RemoteFallback.vue` |
| Listening to remote events | `src/App.vue` → `notifications` module → header badges |
| **ui-dev** shared UI library (exposed as `host/ui-dev`) | `src/ui-dev/` |
| Env loader for `vite.config.mjs` | `config/env.mjs` |
| Inline critical CSS + boot splash | `index.html` |
| Sass tokens/mixins | `src/styles/_tokens.scss`, global styles `src/styles/main.scss` |

## ui-dev library (shared with the remotes)

The host owns the component library in `src/ui-dev` and serves it to shell-a and shell-b:

```js
// vite.config.mjs
federation({ name: 'host', exposes: { './ui-dev': './src/ui-dev/index.mjs' }, … })
```

- The host uses the components directly (auto-registered from `src/ui-dev/components`).
- Remotes write `<UiButton>` and it resolves to `host/ui-dev`.
- `VITE_CORS_ORIGINS` must list every remote origin that loads it.

Components: `UiButton`, `UiCard`, `UiInput`, `UiBadge`, `UiSpinner`, `UiAlert`.
Full reference: [docs/UI_DEV_LIBRARY.md](../../docs/UI_DEV_LIBRARY.md).

## Vite config and env

`vite.config.mjs` calls `readEnv(mode, root, ['VITE_SHELL_A_ENTRY', 'VITE_SHELL_B_ENTRY'])`
from `config/env.mjs`, which loads `.env` + `.env.[mode]` and validates them. Port, host,
`server.origin`, CORS, `base`, sourcemaps, console stripping and remote URLs all come from
there. The host's federation options stay inline in `vite.config.mjs`; only the remotes use
`shared.federation.json`. See [docs/VITE_CONFIG.md](../../docs/VITE_CONFIG.md).

## Routes

| Path | View | Guard |
| --- | --- | --- |
| `/login` | `LoginView` | guest only |
| `/` | `HomeView` (dashboard) | auth |
| `/shell-a` | `ShellAView` → `shellA/App` | auth |
| `/shell-b` | `ShellBView` → `shellB/App` | auth |
| `*` | `NotFoundView` | |

## Login modes

| `VITE_USE_MOCK_AUTH` | Credentials | Behaviour |
| --- | --- | --- |
| `true` (dev default) | `demo / demo123`, `guest / guest123` | In-browser mock, 500 ms delay |
| `false` | `emilys / emilyspass` | `POST https://dummyjson.com/auth/login` with the host axios instance |

The session is stored in `sessionStorage['mfe.auth']`; the remotes' own axios instances read
the token from there. Logout clears it and broadcasts `mfe:auth-changed`.

## Adding a third remote

1. Add `VITE_SHELL_C_ENTRY` to every `.env.*` file of the host.
2. Add it to `REMOTE_ENV` and `remotes` in `vite.config.mjs`, and add the remote's origin to `VITE_CORS_ORIGINS`.
3. Create `src/views/ShellCView.vue` with `defineRemoteComponent(() => import('shellC/App'), 'Shell C')`.
4. Add a route and a header link.

## Env files

`.env`, `.env.development`, `.env.localprod`, `.env.staging`, `.env.production`, `.env.example`.
Details: [docs/ENVIRONMENTS.md](../../docs/ENVIRONMENTS.md).

## Migrating this app from webpack

If this host used to be a Vue CLI / webpack 5 app, these are the concrete changes:

| Before (webpack) | After (this app) |
| --- | --- |
| `vue.config.js` with `ModuleFederationPlugin({ remotes: { shellA: 'shellA@http://localhost:5001/remoteEntry.js' } })` | `vite.config.mjs` → `federation({ remotes: { shellA: { type: 'module', entry: env.VITE_SHELL_A_ENTRY, … } } })` |
| `src/main.js` → `import('./bootstrap')` async boundary | Single `src/main.mjs`, no bootstrap file |
| `public/index.html` with `<%= htmlWebpackPlugin.options.title %>` | Root `index.html` with `%VITE_APP_TITLE%` and inline critical CSS |
| `VUE_APP_SHELL_A_URL` / `process.env` | `VITE_SHELL_A_ENTRY` / `loadEnv()` in config, `import.meta.env` in code |
| `css.loaderOptions.sass.additionalData: '@import "@/styles/vars";'` | `css.preprocessorOptions.scss.additionalData: '@use "@/styles/tokens" as *;'` |
| `app.component(...)` global registration | `unplugin-vue-components` (`src/components` auto-registered) |
| `axios.defaults.baseURL = ...` | `axios.create()` in `src/services/http.mjs` |
| `app.use(store)` | `app.use(store, hostStoreKey)` + `useHostStore()` |
| `devServer: { port: 5000, historyApiFallback: true }` | `server: { port, strictPort: true }` (history fallback built in) |

Full guide: [docs/WEBPACK_TO_VITE_MIGRATION.md](../../docs/WEBPACK_TO_VITE_MIGRATION.md).
