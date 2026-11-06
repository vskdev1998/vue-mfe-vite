/**
 * Tiny cross-micro-frontend event bus built on window CustomEvents.
 *
 * Why not a shared Vuex store or shared JS module?
 *  - Each app must stay independently deployable. A CustomEvent contract
 *    ("mfe:<name>" + a JSON-able payload) is the loosest possible coupling.
 *  - Every app keeps its OWN copy of this file. Nothing is shared via federation.
 *
 * Contract (documented in docs/ARCHITECTURE.md):
 *   mfe:auth-changed   host   -> remotes  { user }
 *   mfe:cart-updated   shellA -> host     { count, items }
 *   mfe:tasks-updated  shellB -> host     { open, total }
 */
export const MFE_EVENT_PREFIX = 'mfe:'
export const AUTH_STORAGE_KEY = 'mfe.auth'

export function emitMfeEvent(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(MFE_EVENT_PREFIX + name, { detail }))
}

/** Subscribe; returns an unsubscribe function. */
export function onMfeEvent(name, handler) {
  const listener = (e) => handler(e.detail)
  window.addEventListener(MFE_EVENT_PREFIX + name, listener)
  return () => window.removeEventListener(MFE_EVENT_PREFIX + name, listener)
}
