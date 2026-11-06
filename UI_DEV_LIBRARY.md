# ui-dev: the shared UI component library

`ui-dev` is a small Vue 3 component library that **lives in the host**
(`apps/host/src/ui-dev`) and is **shared with the remotes through Module Federation**
as `host/ui-dev`. There is no npm package and no separate build: the host serves it from
its own `remoteEntry.js`.

```
apps/host/src/ui-dev/
├─ index.mjs              # public API: named exports + optional install() plugin
├─ styles/ui-dev.css      # design tokens as CSS custom properties (--ui-*)
└─ components/
   ├─ UiAlert.vue  UiBadge.vue  UiButton.vue
   └─ UiCard.vue   UiInput.vue  UiSpinner.vue
```

## How each app gets it

| App | How components are resolved | Source |
| --- | --- | --- |
| host | `unplugin-vue-components` with `dirs: ['src/components', 'src/ui-dev/components']` | local files (no federation) |
| shell-a / shell-b | `unplugin-vue-components` resolver: any `<UiXxx>` → `import { UiXxx } from 'host/ui-dev'` | federated, loaded at runtime from `VITE_HOST_ENTRY` |

So in **every** app you just write the tag, with no import:

```vue
<template>
  <UiCard>
    <UiInput v-model="email" label="Email" />
    <UiButton :loading="saving" @click="save">Save</UiButton>
  </UiCard>
</template>
```

### Host side (`apps/host/vite.config.mjs`)

```js
federation({
  name: 'host',
  exposes: { './ui-dev': './src/ui-dev/index.mjs' },
  bundleAllCSS: true,            // the library's CSS travels with the exposed module
  shareStrategy: 'loaded-first', // a remote loading host/ui-dev must not fetch shell-a/shell-b
  // …remotes, shared: { vue }
})
```

`src/main.mjs` imports `./ui-dev/styles/ui-dev.css` so the host's own pages get the tokens.

### Remote side (`apps/shell-*/vite.config.mjs` + `shared.federation.json`)

```json
"remotes": { "host": { "type": "module", "entryEnv": "VITE_HOST_ENTRY" } }
```

```js
const UiDevResolver = (name) => (/^Ui[A-Z]/.test(name) ? { name, from: 'host/ui-dev' } : undefined)
Components({ dirs: ['src/components'], resolvers: [UiDevResolver] })
```

### Why the remotes `await import('host/ui-dev')` first

`host/ui-dev` is a federated module, so it arrives **asynchronously**. A component whose
`setup()` runs before it has arrived would see `UiButton === undefined`. Both entry points
of a remote therefore wait for it:

- `src/expose/App.mjs` (what the host imports as `shellA/App`): `await import('host/ui-dev')`, then re-exports `App.vue`.
- `src/main.mjs` (standalone): `await import('host/ui-dev')` before `createApp().mount()`.

## Components

| Component | Props | Slots / events |
| --- | --- | --- |
| `UiButton` | `variant` primary · secondary · ghost · danger, `size` sm · md · lg, `type`, `loading`, `disabled`, `block` | default slot |
| `UiCard` | `as` (tag), `padding` (px), `interactive` | default, `#header`, `#footer` |
| `UiInput` | `v-model`, `label`, `type`, `hint`, `error`; other attrs go to `<input>`, `class`/`style` to the wrapper | |
| `UiBadge` | `tone` primary · success · warning · danger · info · neutral | default slot |
| `UiSpinner` | `size` (px), `label` (a11y) | |
| `UiAlert` | `tone` info · success · warning · danger, `title`, `dismissible` | default slot, `@dismiss` |

## Theming

All styles read CSS custom properties defined in `ui-dev.css`:

`--ui-primary`, `--ui-primary-contrast`, `--ui-danger`, `--ui-warning`, `--ui-info`,
`--ui-success`, `--ui-text`, `--ui-muted`, `--ui-surface`, `--ui-border`, `--ui-radius`, `--ui-font`.

Each remote themes the library for its own subtree only:

```scss
// apps/shell-a/src/App.vue
.shell-a {
  --ui-primary: #{$accent};   // indigo buttons, badges, focus rings inside shell-a
  --ui-border: #{$border};
}
```

## Adding a component

1. Create `apps/host/src/ui-dev/components/UiThing.vue` (scoped CSS, use `--ui-*` vars, import
   sibling Ui components explicitly).
2. Export it from `apps/host/src/ui-dev/index.mjs` (named export **and** in the `components` map).
3. Host: nothing else, it's auto-registered. Remotes: nothing else, `<UiThing>` resolves to `host/ui-dev`.

## Rules (it's a shared contract)

- **Backwards compatible only.** Remotes always get the version the host serves right now.
  Add props, don't rename or remove them; deprecate first.
- `UI_DEV_VERSION` in `index.mjs` documents what's deployed; bump it on changes.
- No store, router or axios usage inside ui-dev: components are presentational.
- Remotes running **standalone need the host running** (dev: `npm run dev` at the root starts all).
