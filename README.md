# vue-mfe-vite

A complete, working **Vue 3 + Vite 7 micro-frontend** monorepo built with **Module Federation**.

| App | Role | Port | Exposes / consumes | Theme |
| --- | --- | --- | --- | --- |
| [`apps/host`](apps/host/README.md) | Container: routing, **login**, layout, header | 5000 | consumes `shellA/App`, `shellB/App` | green |
| [`apps/shell-a`](apps/shell-a/README.md) | Remote: product catalog + cart | 5001 | exposes `./App` | indigo |
| [`apps/shell-b`](apps/shell-b/README.md) | Remote: task board | 5002 | exposes `./App` | teal |

### What's inside

- **Vite 7** (`vite@^7.3`) with `@vitejs/plugin-vue@6`
- **Module Federation** via [`@module-federation/vite`](https://module-federation.io/integrations/build-tool/vite) (works in dev *and* build)
- **Sass** (modern compiler API) with per-app design tokens injected through `additionalData`
- **Critical CSS inline in each `index.html`** (background + boot splash before JS loads)
- **Auto import**: `unplugin-auto-import` (vue, vuex, vue-router, own composables) and `unplugin-vue-components` (no manual component registration)
- **Vuex 4: one independent store per app**, each installed/provided under its own injection key
- **axios: one private instance per app** (own baseURL, timeout, interceptors) and **not shared** through federation
- **Sample login** in the host (route guard, session in `sessionStorage`)
- Cross-app communication with a tiny `window` CustomEvent bus (`mfe:*`) instead of shared state
- Per-app env files for **development / localprod / staging / production**
- Offline fixtures, so the demo still works behind a proxy with no internet

## Quick start

Requirements: **Node 20.19+ or 22.12+** (Vite 7 requirement) and npm 10+.

```bash
npm install          # installs all three workspaces
npm run dev          # starts host :5000, shell-a :5001, shell-b :5002 together
```

Open **http://localhost:5000** and sign in with **`demo / demo123`** (or `guest / guest123`).

Each remote also runs on its own: http://localhost:5001 and http://localhost:5002.

### Production build, locally

```bash
npm run start        # = build:localprod (all apps) + vite preview on 5000/5001/5002
```

### All scripts (root)

| Script | What it does |
| --- | --- |
| `npm run dev` | All three dev servers in parallel (`concurrently`) |
| `npm run dev:host` / `dev:shell-a` / `dev:shell-b` | One app only |
| `npm run build` | Production build (`.env.production`), remotes first, then host |
| `npm run build:staging` | Staging build (`.env.staging`) |
| `npm run build:localprod` | Production bundles pointing at localhost (`.env.localprod`) |
| `npm run preview` | Serve every `dist/` with `vite preview` |
| `npm run start` | `build:localprod` + `preview` |
| `npm run docs` | Build the docs site and serve it on :5050 |
| `npm run docs:build` | Regenerate `docs/site/index.html` from the Markdown |
| `npm run clean` | Remove `dist/` and federation temp folders |

## Repository layout

```
vue-mfe-vite/
├─ package.json            # npm workspaces + orchestration scripts
├─ scripts/                # build-docs.mjs + docs-template.html
├─ docs/
│  ├─ site/index.html     # generated developer docs site (open in a browser)
│  ├─ ARCHITECTURE.md      # how host/remotes, stores, axios, events fit together
│  ├─ ENVIRONMENTS.md      # every env file and variable, per app
│  ├─ VITE7_GUIDE.md       # Vite 7 explained using this repo
│  └─ WEBPACK_TO_VITE_MIGRATION.md
└─ apps/
   ├─ host/                # :5000
   ├─ shell-a/             # :5001
   └─ shell-b/             # :5002
      ├─ .env, .env.development, .env.localprod, .env.staging, .env.production, .env.example
      ├─ index.html        # inline critical CSS
      ├─ vite.config.js    # vue + auto-import + components + federation + sass
      └─ src/
         ├─ App.vue        # (remotes) exposed root component, provides its own store
         ├─ main.js        # standalone bootstrap
         ├─ components/    # auto-registered
         ├─ composables/   # auto-imported (useShellAStore, useHostStore, …)
         ├─ services/      # private axios instance + API services (+ fixtures)
         ├─ store/         # private Vuex store + modules
         ├─ styles/        # _tokens.scss (vars/mixins) + global styles
         └─ utils/         # mfeBus.js (own copy in every app)
```

## Documentation

**Developer docs site:** open [`docs/site/index.html`](docs/site/index.html) in a browser (works from disk), or run `npm run docs` to serve it at http://localhost:5050. It is generated from the Markdown files below by `scripts/build-docs.mjs`; after editing any `.md`, run `npm run docs:build`.

- [Architecture](docs/ARCHITECTURE.md)
- [Environments & env files](docs/ENVIRONMENTS.md)
- [Vite 7 guide](docs/VITE7_GUIDE.md)
- [Migrating from webpack (Vue CLI / webpack 5 Module Federation) to Vite](docs/WEBPACK_TO_VITE_MIGRATION.md)
- App READMEs: [host](apps/host/README.md) · [shell-a](apps/shell-a/README.md) · [shell-b](apps/shell-b/README.md)

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Shell A is unavailable" card in the host | The remote isn't running. `npm run dev` at the root starts all apps. Check `VITE_SHELL_A_ENTRY`. |
| Port already in use | Ports are `strictPort`. Free 5000–5002 or change `VITE_PORT` (and the host's `VITE_SHELL_*_ENTRY`). |
| Remote chunks 404 in production | The remote's `VITE_PUBLIC_URL` (build `base`) must be the URL it is deployed at. |
| Products / tasks show fixture data | The public APIs (dummyjson / jsonplaceholder) were unreachable; the services fell back to `src/services/fixtures`. |
| `Unsupported engine` / Vite won't start | Upgrade Node to 20.19+ or 22.12+. |
