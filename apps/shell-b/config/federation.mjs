/**
 * Builds the @module-federation/vite options from shared.federation.json.
 *
 * shared.federation.json is the app's federation CONTRACT (name, exposes,
 * remotes, shared deps). It is static and reviewed like code.
 * .env.[mode] supplies the environment-specific bits (remote URLs), referenced
 * from the JSON by `remotes.<name>.entryEnv`.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function loadFederationJson(root) {
  const file = resolve(root, 'shared.federation.json')
  const json = JSON.parse(readFileSync(file, 'utf8'))
  if (!json.name) throw new Error(`${file}: "name" is required`)
  return json
}

/** Env keys the JSON expects (used to validate .env.[mode]). */
export function remoteEnvKeys(json) {
  return Object.values(json.remotes || {}).map((r) => r.entryEnv)
}

/** Resolved { remoteName: url } map, for logging. */
export function resolveRemoteUrls(json, rawEnv) {
  return Object.fromEntries(
    Object.entries(json.remotes || {}).map(([name, r]) => [name, rawEnv[r.entryEnv]]),
  )
}

/**
 * @param {object} json    parsed shared.federation.json
 * @param {object} rawEnv  all env vars for the current mode
 * @param {object} pkg     the app's package.json (to check shared versions)
 */
export function createFederationOptions(json, rawEnv, pkg) {
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  // Every shared package must be a real dependency of this app
  for (const name of Object.keys(json.shared || {})) {
    if (!deps[name]) throw new Error(`[federation] "${name}" is shared but not in package.json`)
  }
  // Guard against accidentally sharing what must stay private
  for (const name of Object.keys(json.notShared || {})) {
    if (json.shared?.[name]) throw new Error(`[federation] "${name}" is listed in both shared and notShared`)
  }

  const remotes = Object.fromEntries(
    Object.entries(json.remotes || {}).map(([name, r]) => [
      name,
      {
        type: r.type || 'module',
        name: r.name || name,
        entry: rawEnv[r.entryEnv],
        entryGlobalName: r.entryGlobalName || name,
        shareScope: r.shareScope || 'default',
      },
    ]),
  )

  return {
    name: json.name,
    filename: json.filename || 'remoteEntry.js',
    exposes: json.exposes || {},
    remotes,
    shared: json.shared || {},
    bundleAllCSS: json.bundleAllCSS ?? false,
    shareStrategy: json.shareStrategy || 'loaded-first',
    dts: false, // plain JavaScript project
  }
}
