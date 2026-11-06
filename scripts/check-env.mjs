#!/usr/bin/env node
/**
 * Verifies the env files of every app in every mode:
 *   - required keys exist (incl. API gateway + mock keys)
 *   - every app has its OWN gateway key (no two apps share a key in the same mode)
 *   - every mode has a different key (dev key ≠ prod key)
 *   - the mock API key matches the app key (otherwise the mock answers 401)
 *   - remote entry URLs and VITE_PUBLIC_URL are absolute URLs
 *
 *   npm run check:env          → exits 1 on any error (runs before dev/build)
 */
import { loadEnv } from 'vite'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const APPS = {
  host: ['VITE_SHELL_A_ENTRY', 'VITE_SHELL_B_ENTRY'],
  'shell-a': ['VITE_HOST_ENTRY'],
  'shell-b': ['VITE_HOST_ENTRY'],
}
const MODES = ['development', 'localprod', 'staging', 'production']
const REQUIRED = [
  'VITE_APP_NAME', 'VITE_PORT', 'VITE_PUBLIC_URL', 'VITE_API_BASE_URL',
  'VITE_API_GATEWAY_HEADER', 'VITE_API_GATEWAY_KEY', 'VITE_MOCK_GATEWAY_KEY',
]
const KEY_RE = /^gw_[a-z0-9]+_[a-z]+_[0-9a-f]{16}$/

const errors = []
const keysByMode = {}
const keysByApp = {}
const rows = []

for (const [app, remoteKeys] of Object.entries(APPS)) {
  for (const mode of MODES) {
    const env = loadEnv(mode, resolve(root, 'apps', app), '')
    const where = `${app}/.env.${mode}`
    for (const k of [...REQUIRED, ...remoteKeys]) if (!env[k]) errors.push(`${where}: missing ${k}`)
    for (const k of ['VITE_PUBLIC_URL', ...remoteKeys])
      if (env[k] && !/^https?:\/\//.test(env[k])) errors.push(`${where}: ${k} must be an absolute URL`)

    const key = env.VITE_API_GATEWAY_KEY
    if (key && !KEY_RE.test(key)) errors.push(`${where}: VITE_API_GATEWAY_KEY "${key}" doesn't look like gw_<app>_<env>_<16 hex>`)
    if (key && env.VITE_MOCK_GATEWAY_KEY !== key) errors.push(`${where}: VITE_MOCK_GATEWAY_KEY ≠ VITE_API_GATEWAY_KEY (mock API would return 401)`)

    if (key) {
      ;(keysByMode[mode] ||= []).push([app, key])
      ;(keysByApp[app] ||= []).push([mode, key])
    }
    rows.push({ app, mode, port: env.VITE_PORT, key: key ? `${key.slice(0, -12)}…${key.slice(-4)}` : '-', mock: env.VITE_MOCK_GATEWAY_KEY === key ? 'ok' : 'MISMATCH' })
  }
}

for (const [mode, list] of Object.entries(keysByMode)) {
  const seen = new Map()
  for (const [app, key] of list) {
    if (seen.has(key)) errors.push(`.env.${mode}: ${app} and ${seen.get(key)} use the same gateway key; each app needs its own`)
    seen.set(key, app)
  }
}
for (const [app, list] of Object.entries(keysByApp)) {
  if (new Set(list.map(([, k]) => k)).size !== list.length) errors.push(`${app}: the same gateway key is used in more than one mode`)
}

console.table(rows)
if (errors.length) {
  console.error(`\n✖ ${errors.length} env problem(s):\n  - ${errors.join('\n  - ')}\n`)
  process.exit(1)
}
console.log('✔ env OK: every app has its own gateway key per mode and the mock API keys match.')
