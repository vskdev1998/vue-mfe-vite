/**
 * ui-dev: the host-owned UI component library.
 *
 *  - Used locally by the host (auto-registered by unplugin-vue-components).
 *  - Exposed to the remotes through Module Federation as `host/ui-dev`
 *    (see `exposes` in apps/host/vite.config.mjs). shell-a and shell-b
 *    auto-import every <Ui*> tag from there with a components resolver.
 *
 * Keep the API backwards compatible: remotes are deployed independently and
 * always get the version the host currently serves.
 */
import './styles/ui-dev.css'
import UiAlert from './components/UiAlert.vue'
import UiBadge from './components/UiBadge.vue'
import UiButton from './components/UiButton.vue'
import UiCard from './components/UiCard.vue'
import UiInput from './components/UiInput.vue'
import UiSpinner from './components/UiSpinner.vue'

export { UiAlert, UiBadge, UiButton, UiCard, UiInput, UiSpinner }

export const UI_DEV_VERSION = '1.0.0'

const components = { UiAlert, UiBadge, UiButton, UiCard, UiInput, UiSpinner }

/** Optional plugin: app.use(UiDev) registers every component globally. */
export default {
  install(app) {
    for (const [name, component] of Object.entries(components)) app.component(name, component)
  },
}
