# Architecture

```
                          Browser (one page, one Vue app instance)
┌──────────────────────────────────────────────────────────────────────────────┐
│ HOST  http://localhost:5000                                                  │
│  vue-router · login guard · AppHeader · Vuex(hostStoreKey) · axios(host)     │
│                                                                              │
│   /shell-a  ──► defineRemoteComponent(() => import('shellA/App'))            │
│                 │  loads http://localhost:5001/remoteEntry.js at runtime     │
│                 ▼                                                            │
│   ┌──────────────────────────────┐   ┌──────────────────────────────┐        │
│   │ SHELL-A  <App :user/>        │   │ SHELL-B  <App :user/>        │        │
│   │ provide(shellAStoreKey)      │   │ provide(shellBStoreKey)      │        │
│   │ Vuex: catalog, cart          │   │ Vuex: tasks                  │        │
│   │ axios(shell-a) → dummyjson   │   │ axios(shell-b) → jsonplaceh. │        │
│   └──────────────┬───────────────┘   └──────────────┬───────────────┘        │
│                  │ mfe:cart-updated                 │ mfe:tasks-updated      │
│                  └──────────────► window ◄──────────┘                        │
│                        host App.vue listens → notifications module          │
└──────────────────────────────────────────────────────────────────────────────┘
        shared via federation: vue (singleton) ONLY
```

## 1. Module Federation

Plugin: `@module-federation/vite` (Module Federation 2.0 runtime, maintained by the
Module Federation org and recommended by the Vite team). Unlike the older
`@originjs/vite-plugin-federation`, remotes work in **dev mode**, so you get HMR in
every app while running the host.

**Remotes** (`apps/shell-*/vite.config.js`):

```js
federation({
  name: 'shellA',                 // container name, must be unique
  filename: 'remoteEntry.js',     // served at <VITE_PUBLIC_URL>/remoteEntry.js
  exposes: { './App': './src/App.vue' },
  shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } },
  bundleAllCSS: true,             // inject this remote's CSS when the host loads ./App
  dts: false,                     // plain JS project
})
```

**Host** (`apps/host/vite.config.js`):

```js
federation({
  name: 'host',
  remotes: {
    shellA: { type: 'module', name: 'shellA', entry: env.VITE_SHELL_A_ENTRY, entryGlobalName: 'shellA', shareScope: 'default' },
    shellB: { type: 'module', name: 'shellB', entry: env.VITE_SHELL_B_ENTRY, entryGlobalName: 'shellB', shareScope: 'default' },
  },
  shared: { vue: { singleton: true, requiredVersion: '^3.5.0' } },
})
```

The host imports `shellA/App` like a normal module. `src/utils/defineRemoteComponent.js`
wraps it in `defineAsyncComponent` with loading and error components, so a remote that
is down shows a friendly card instead of breaking the page.

### What is shared and why

| Package | Shared? | Reason |
| --- | --- | --- |
| `vue` | ✅ singleton | Remotes render inside the host's Vue app; two Vue runtimes would break reactivity and `provide/inject`. |
| `vue-router` | ❌ | Only the host routes. Remotes expose components, not routers. |
| `vuex` | ❌ | Each app must own its store and its Vuex version. |
| `axios` | ❌ | Each app owns its HTTP client, interceptors and defaults (requirement). |

## 2. Independent Vuex stores

Because remotes render **inside the host's Vue app**, a bare `useStore()` in a remote
would resolve the *host's* store (or nothing). To keep stores isolated:

1. Every app creates its store **and its own injection key**:
   `hostStoreKey`, `shellAStoreKey`, `shellBStoreKey` (`src/store/index.js`).
2. The host installs its store with `app.use(store, hostStoreKey)`.
3. Each remote's root `App.vue` calls `provide(shellAStoreKey, store)`, so its whole
   subtree resolves its own store, both inside the host and standalone.
4. Components use auto-imported helpers: `useHostStore()`, `useShellAStore()`,
   `useShellBStore()` (`src/composables`).

All modules are `namespaced: true`.

## 3. Private axios instances

`src/services/http.js` exists in **every** app and calls `axios.create()`:

| App | baseURL (dev) | timeout | Header |
| --- | --- | --- | --- |
| host | `https://dummyjson.com` | `VITE_API_TIMEOUT` (10s) | `X-Client-App: host` |
| shell-a | `https://dummyjson.com` | 8s | `X-Client-App: shell-a` |
| shell-b | `https://jsonplaceholder.typicode.com` | 8s | `X-Client-App: shell-b` |

Interceptors are per instance. The global `axios` default instance is never configured,
and axios is not in `shared`, so every bundle carries its own copy.

## 4. Authentication contract

- The host logs in (`store/modules/auth.js` → `services/authService.js`).
- The session `{ user, token }` is written to `sessionStorage['mfe.auth']`.
- Each remote's axios request interceptor reads the token from that key and sends
  `Authorization: Bearer <token>`.
- The host also passes `user` as a prop to each remote root component.
- Login/logout broadcasts `mfe:auth-changed`.

Mock login: `demo / demo123`, `guest / guest123`. Set `VITE_USE_MOCK_AUTH=false` to use
the real dummyjson endpoint (`emilys / emilyspass`).

## 5. Event bus (`src/utils/mfeBus.js`, one copy per app)

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
- API unreachable → the remote's service falls back to `src/services/fixtures`.
- Remote throws during render → only that route's view is affected.
