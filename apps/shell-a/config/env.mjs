/**
 * Env loader used by vite.config.mjs.
 *
 * Reads .env + .env.[mode] (+ *.local) with Vite's loadEnv, validates the
 * required keys and returns typed values. `npm run dev` → mode "development"
 * → .env.development, `vite build --mode staging` → .env.staging, etc.
 *
 * Every app has its OWN copy of this file (independent deployability).
 * Keys that hold remote URLs are declared in shared.federation.json
 * (`remotes.<name>.entryEnv`) and are validated here too.
 */
import { loadEnv } from 'vite'

const REQUIRED = ['VITE_APP_NAME', 'VITE_PORT', 'VITE_PUBLIC_URL', 'VITE_API_BASE_URL']

const bool = (v, fallback = false) => (v === undefined || v === '' ? fallback : v === 'true')
const list = (v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])
const trimSlash = (url) => url.replace(/\/$/, '')

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
        ...Object.fromEntries(Object.entries(remotes).map(([k, v]) => [`remote:${k}`, v])),
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
