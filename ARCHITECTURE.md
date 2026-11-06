# Architecture

```
                          Browser (one page, one Vue app instance)
┌──────────────────────────────────────────────────────────────────────────────┐
│ HOST  http://localhost:8080                                                  │
│  vue-router · login guard · AppHeader · Vuex(hostStoreKey) · axios(host)     │
│                                                                              │
│   /shell-a  ──► defineRemoteComponent(() => import('shellA/App'))            │
│                 │  loads http://localhost:8081/remoteEntry.js at runtime     │
│                 ▼                                                            │
│   EXPOSES host/ui-dev ◄──── <Ui*> components used by both remotes ───┐      │
│   ┌──────────────────────────────┐   ┌──────────────────────────────┐ │      │
│   │ SHELL-A  <App :user/>        │   │ SHELL-B  <App :user/>        │        │
│   │ provide(shellAStoreKey)      │   │ provide(shellBStoreKey)      │        │
│   │ Vuex: catalog, cart          │   │ Vuex: tasks                  │        │
│   │ axios(shell-a) → dummyjson   │   │ axios(shell-b) → jsonplaceh. │        │
│   └──────────────┬───────────────┘   └──────────────┬───────────────┘        │
│                  │ mfe:cart-updated                 │ mfe:tasks-updated      │
│                  └──────────────► window ◄──────────┘                        │
│                        host App.vue listens → notifications module          │
└──────────────────────────────────────────────────────────────────────────────┘
        shared via federation: vue (singleton) + host/ui-dev (exposed module)
```

## 1. Module Federation

Plugin: `@module-federation/vite` (Module Federation 2.0 runtime, maintained by the
Module Federation org and recommended by the Vite team). Unlike the older
`@originjs/vite-plugin-federation`, remotes work in **dev mode**, so you get HMR in
every app while running the host.

Federation runs **both ways**:

| App | Exposes | Consumes |
| --- | --- | --- |
| host | `./ui-dev` (shared UI library) | `shellA/App`, `shellB/App` |
| shell-a | `./App` | `host/ui-dev` |
| shell-b | `./App` | `host/ui-dev` |

**Remotes** read their options from `shared.federation.json` (see [How vite.config.mjs is built](VITE_CONFIG.md)):

```json
{
  "name": "shellA",
  "exposes": { "./App": "./src/expose/App.mjs" },
  "remotes": { "host": { "type": "module", "entryEnv": "VITE_HOST_ENTRY" } },
  "shared": { "vue": { "singleton": true, "requiredVersion": "^3.5.0" } },
  "bundleAllCSS": true,
  "shareStrategy": "loaded-first"
}
```

**Host** keeps its options inline in `apps/host/vite.config.mjs`:

```js
federation({
  name: 'host',
  exposes: { './ui-dev': './src/ui-dev/index.mjs' },
  remotes: {
    shellA: { type: 'module', name: 'shellA', entry: env.raw.VITE_SHELL_A_ENTRY, entryGlobalName: 'shellA' },
    shellB: { type: 'module', name: 'shellB', entry: env.raw.VITE_SHELL_B_ENTRY, entryGlobalName: 'shellB' },
  },
  shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } },
  bundleAllCSS: true,
  shareStrategy: 'loaded-first',
})
```

The host imports `shellA/App` like a normal module. `src/utils/defineRemoteComponent.mjs`
wraps it in `defineAsyncComponent` with loading and error components, so a remote that
is down shows a friendly card instead of breaking the page.

`shareStrategy: 'loaded-first'` stops the runtime from fetching every remote's
`remoteEntry.js` up front. Without it, a standalone shell-b that loads `host/ui-dev` would
also try to fetch shell-a.

### Shared UI library

See [ui-dev](UI_DEV_LIBRARY.md). Remotes write `<UiButton>` with no import, and a
components resolver turns it into `import { UiButton } from 'host/ui-dev'`. Each remote's
exposed entry (`src/expose/App.mjs`) awaits `host/ui-dev` before the host renders it.

### What is shared and why

| Package / module | Shared? | Reason |
| --- | --- | --- |
| `vue` | ✅ singleton | Remotes render inside the host's Vue app; two Vue runtimes would break reactivity and `provide/inject`. |
| `host/ui-dev` | ✅ exposed module | One component library, owned and served by the host. |
| `vue-router` | ❌ | Only the host routes. Remotes expose components, not routers. |
| `vuex` | ❌ | Each app must own its store and its Vuex version. |
| `axios` | ❌ | Each app owns its HTTP client, interceptors and defaults (requirement). |

## 2. Independent Vuex stores

Because remotes render **inside the host's Vue app**, a bare `useStore()` in a remote
would resolve the *host's* store (or nothing). To keep stores isolated:

1. Every app creates its store **and its own injection key**:
   `hostStoreKey`, `shellAStoreKey`, `shellBStoreKey` (`src/store/index.mjs`).
2. The host installs its store with `app.use(store, hostStoreKey)`.
3. Each remote's root `App.vue` calls `provide(shellAStoreKey, store)`, so its whole
   subtree resolves its own store, both inside the host and standalone.
4. Components use auto-imported helpers: `useHostStore()`, `useShellAStore()`,
   `useShellBStore()` (`src/composables`).

All modules are `namespaced: true`.

## 3. Private axios instances

`src/services/http.mjs` exists in **every** app and calls `axios.create()`:

| App | baseURL (dev) | timeout | Header |
| --- | --- | --- | --- |
| host | `https://dummyjson.com` | `VITE_API_TIMEOUT` (10s) | `X-Client-App: host` |
| shell-a | `https://dummyjson.com` | 8s | `X-Client-App: shell-a` |
| shell-b | `https://jsonplaceholder.typicode.com` | 8s | `X-Client-App: shell-b` |

Every instance also sends **its own API gateway key** (`x-api-gateway-key`, different per app and per
environment), and mock requests are answered by an axios adapter that verifies that key first.
See [ENVIRONMENTS.md](ENVIRONMENTS.md#api-gateway-keys-and-the-mock-api).

Interceptors are per instance. The global `axios` default instance is never configured,
and axios is not in `shared`, so every bundle carries its own copy.

## 4. Authentication contract

- The host logs in (`store/modules/auth.mjs` → `services/authService.mjs`).
- The session `{ user, token }` is written to `sessionStorage['mfe.auth']`.
- Each remote's axios request interceptor reads the token from that key and sends
  `Authorization: Bearer <token>`.
- The host also passes `user` as a prop to each remote root component.
- Login/logout broadcasts `mfe:auth-changed`.

Mock login: `demo / demo123`, `guest / guest123`. Set `VITE_USE_MOCK_AUTH=false` to use
the real dummyjson endpoint (`emilys / emilyspass`).

## 5. Event bus (`src/utils/mfeBus.mjs`, one copy per app)

| Event | Publisher → Subscriber | Payload |
| --- | --- | --- |
| `mfe:auth-changed` | host → remotes | `{ user }` |
| `mfe:cart-updated` | shell-a → host | `{ count, items[] }` |
| `mfe:tasks-updated` | shell-b → host | `{ open, total }` |

The host listens in `App.vue` and commits into its `notifications` module, which drives
the header badges and dashboard cards.

## 6. Styling

- `index.html` of each app carries **inline critical CSS** (background, font, splash).
  Remote `index.html` files are only used standalone, so their inline CSS never reaches the host.
- `src/styles/_tokens.scss` holds variables, mixins and functions only, injected into
  every `<style lang="scss">` via `css.preprocessorOptions.scss.additionalData`.
- Remote components are `scoped` and namespaced by a root class (`.shell-a`, `.shell-b`).
  With `bundleAllCSS: true` **all** CSS imported by a remote ships with `./App`, so keep
  global selectors out of remotes. Standalone-only layout lives inline in `index.html`.

## 7. Failure isolation

- Remote unreachable → `RemoteFallback` error card (host keeps working).
- Host unreachable → standalone remotes can't load `host/ui-dev` (run the host too).
- API unreachable → the remote's service falls back to `src/services/fixtures`.
- Remote throws during render → only that route's view is affected.
