/**
 * Federated entry for `./App` (see shared.federation.json → exposes).
 *
 * Components in this remote use <Ui*> tags that unplugin-vue-components resolves
 * to `host/ui-dev`, a federated module loaded asynchronously from the host.
 * Awaiting it here (top-level await) guarantees the library is ready before the
 * host renders any component of this remote; otherwise a component set up
 * too early would see `undefined` for UiButton/UiInput.
 */
await import('host/ui-dev')

export { default } from '../App.vue'
