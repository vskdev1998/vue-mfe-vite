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

## Host (`apps/host`)

| Variable | development | localprod | staging | production |
| --- | --- | --- | --- | --- |
| `VITE_APP_NAME` | host | host | host | host |
| `VITE_PORT` | 5000 | 5000 | 5000 | 5000 |
| `VITE_PUBLIC_URL` | http://localhost:5000/ | http://localhost:5000/ | https://staging.example.com/ | https://app.example.com/ |
| `VITE_API_BASE_URL` | https://dummyjson.com | https://dummyjson.com | https://api.staging.example.com | https://api.example.com |
| `VITE_SHELL_A_ENTRY` | http://localhost:5001/remoteEntry.js | same | https://shell-a.staging.example.com/remoteEntry.js | https://shell-a.example.com/remoteEntry.js |
| `VITE_SHELL_B_ENTRY` | http://localhost:5002/remoteEntry.js | same | https://shell-b.staging.example.com/remoteEntry.js | https://shell-b.example.com/remoteEntry.js |
| `VITE_USE_MOCK_AUTH` | true | true | false | false |
| `VITE_API_TIMEOUT` | 10000 (from `.env`) | | | |

`vite.config.js` reads `VITE_SHELL_*_ENTRY` with `loadEnv()` and **fails the build** if one is
missing for the current mode.

## Remotes (`apps/shell-a`, `apps/shell-b`)

| Variable | development | localprod | staging | production |
| --- | --- | --- | --- | --- |
| `VITE_PORT` | 5001 / 5002 | same | same | same |
| `VITE_PUBLIC_URL` | http://localhost:500x/ | http://localhost:500x/ | https://shell-x.staging.example.com/ | https://shell-x.example.com/ |
| `VITE_API_BASE_URL` | dummyjson (A) / jsonplaceholder (B) | same | same | same |
| `VITE_HOST_URL` | http://localhost:5000/ | same | https://staging.example.com/ | https://app.example.com/ |
| `VITE_USE_MOCK_API` | false | false | false | false |
| `VITE_API_TIMEOUT` | 8000 (from `.env`) | | | |

`VITE_PUBLIC_URL` is the most important remote variable:

- **dev**: becomes `server.origin`, so the remote's dev assets are requested from `:5001`
  even though the page is the host on `:5000`.
- **build**: becomes Vite's `base`. `remoteEntry.js` imports its chunks relative to this URL.
  If it's wrong, the host loads `remoteEntry.js` and then 404s on every chunk.

## Deploying to real environments

1. Replace `example.com` URLs in `.env.staging` / `.env.production` of all three apps.
2. Build and deploy the **remotes first** (`npm run build:staging -w @mfe/shell-a`, …).
3. Build and deploy the host.
4. Remotes must send CORS headers allowing the host origin for `remoteEntry.js` and chunks
   (`Access-Control-Allow-Origin`), or be served from the same domain under different paths,
   e.g. `https://app.example.com/mfe/shell-a/` (then use that as `VITE_PUBLIC_URL`).
5. Serve `remoteEntry.js` with `Cache-Control: no-cache`; hashed chunks can be cached forever.

### Overriding at build time from CI

```bash
VITE_SHELL_A_ENTRY=https://cdn.acme.io/shell-a/1.4.2/remoteEntry.js npm run build -w @mfe/host
```

Shell variables take priority over every `.env*` file.
