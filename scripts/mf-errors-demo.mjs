// Reproduces Module Federation runtime errors (see MODULE_FEDERATION.md §7.1)
// Run: npm run mf:errors
import * as rt from '@module-federation/runtime'

const show = async (code, fn) => {
  try { await fn() } catch (e) { console.log(`\n--- ${code}\n${e.message}`) }
}

await show('RUNTIME-009', () => rt.loadRemote('shellA/App'))            // no instance yet
const mf = rt.init({
  name: 'host',
  remotes: [{ name: 'shellA', type: 'module', entry: 'http://127.0.0.1:9/remoteEntry.js' }],
})
await show('RUNTIME-004', () => mf.loadRemote('shellZ/App'))             // unknown remote
await show('RUNTIME-008', () => mf.loadRemote('shellA/App'))             // nothing listening
rt.registerShared({
  dep: { version: '1.0.0', get: () => Promise.resolve(() => ({})), shareConfig: { requiredVersion: false } },
})
await show('RUNTIME-006', () => mf.loadShareSync('dep'))                  // async share, sync call
