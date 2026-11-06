/**
 * Env loader used by vite.config.mjs.
 *
 * Reads .env + .env.[mode] (+ *.local) with Vite's loadEnv, validates the
 * required keys and returns typed values. `npm run dev` → mode "development"
 * → .env.development, `vite build --mode staging` → .env.staging, etc.
 *
 * Every app has its OWN copy of this file (independent deployability).
 * Keys that hold remote URLs are passed in as `extra` and validated too.
 */
import { loadEnv } from 'vite'

const REQUIRED = [
  'VITE_APP_NAME',
  'VITE_PORT',
  'VITE_PUBLIC_URL',
  'VITE_API_BASE_URL',
  'VITE_API_GATEWAY_HEADER',
  'VITE_API_GATEWAY_KEY',
  'VITE_MOCK_GATEWAY_KEY',
]

const mask = (k = '') => (k.length > 12 ? `${k.slice(0, k.length - 12)}…${k.slice(-4)}` : '(missing)')

const bool = (v, fallback = false) => (v === undefined || v === '' ? fallback : v === 'true')
const list = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])
const trimSlash = (url) => url.replace(/\/$/, '')
/** "true" → true (allow any host, NOT recommended), otherwise a host list */
const hosts = (v) => (v === 'true' ? true : list(v))

/**
 * @param {string} mode       Vite mode (development | localprod | staging | production)
 * @param {string} root       app folder containing the .env files
 * @param {string[]} extra    additional required keys (remote entry vars)
 */
export function readEnv(mode, root = process.cwd(), extra = []) {
  const raw = loadEnv(mode, root, '') // '' → all keys, not only VITE_*

  const missing = [...REQUIRED, ...extra].filter((k) => !raw[k])
  if (missing.length) {
    throw new Error(
      `[${raw.VITE_APP_NAME || 'app'}] missing env for mode "${mode}": ${missing.join(', ')}\n` +
        `  → add them to .env.${mode} (see .env.example)`,
    )
  }

  // The mock API only accepts VITE_MOCK_GATEWAY_KEY. A mismatch is allowed (handy to test
  // the 401 path) but we say so loudly. `npm run check:env` treats it as an error.
  const gatewayMismatch = raw.VITE_MOCK_GATEWAY_KEY !== raw.VITE_API_GATEWAY_KEY
  if (gatewayMismatch) {
    console.warn(
      `\x1b[33m[${raw.VITE_APP_NAME}] VITE_MOCK_GATEWAY_KEY does not match VITE_API_GATEWAY_KEY in .env.${mode}: ` +
        `the mock API will reject every request with 401.\x1b[0m`,
    )
  }

  const publicUrl = raw.VITE_PUBLIC_URL.endsWith('/') ? raw.VITE_PUBLIC_URL : `${raw.VITE_PUBLIC_URL}/`

  return {
    raw,
    mode,
    appName: raw.VITE_APP_NAME,
    appEnv: raw.VITE_APP_ENV || mode,
    port: Number(raw.VITE_PORT),
    devHost: raw.VITE_DEV_HOST || 'localhost',
    open: bool(raw.VITE_OPEN),
    publicUrl,
    origin: trimSlash(publicUrl),
    apiBaseUrl: raw.VITE_API_BASE_URL,
    corsOrigins: list(raw.VITE_CORS_ORIGINS),
    gateway: {
      header: raw.VITE_API_GATEWAY_HEADER,
      key: raw.VITE_API_GATEWAY_KEY,
      masked: mask(raw.VITE_API_GATEWAY_KEY),
      mockMatches: !gatewayMismatch,
    },
    // server.allowedHosts / preview.allowedHosts (Vite blocks unknown Host headers)
    allowedHosts: hosts(raw.VITE_ALLOWED_HOSTS),
    // custom build entry + output layout
    buildEntry: raw.VITE_BUILD_ENTRY || 'index.html',
    outDir: raw.VITE_OUT_DIR || 'dist',
    assetsDir: raw.VITE_ASSETS_DIR || 'assets',
    sourcemap: bool(raw.VITE_SOURCEMAP, mode !== 'production'),
    dropConsole: bool(raw.VITE_DROP_CONSOLE, mode === 'production'),
  }
}

/** Tiny plugin: prints the resolved env when the dev server / build starts. */
export function envBanner(env, remotes = {}) {
  return {
    name: 'env-banner',
    configResolved(config) {
      const rows = {
        mode: env.mode,
        app: `${env.appName} (${env.appEnv})`,
        url: env.publicUrl,
        api: env.apiBaseUrl,
        gateway: `${env.gateway.header}: ${env.gateway.masked} (mock ${env.gateway.mockMatches ? 'ok' : 'MISMATCH'})`,
        ...Object.fromEntries(Object.entries(remotes).map(([k, v]) => [`remote:${k}`, v])),
        entry: `${env.buildEntry} → ${env.outDir}/`,
        allowedHosts: Array.isArray(env.allowedHosts) ? env.allowedHosts.join(', ') || '(localhost only)' : 'any',
        sourcemap: String(env.sourcemap),
      }
      config.logger.info(
        '\n  \x1b[36menv\x1b[0m ' +
          Object.entries(rows)
            .map(([k, v]) => `${k.padEnd(14)} ${v}`)
            .join('\n      '),
      )
    },
  }
}
