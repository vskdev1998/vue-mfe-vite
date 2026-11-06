<script setup>
/** <UiInput v-model="x" label="Email" type="email" :error="msg" hint="…" /> */
import { computed, useAttrs, useId } from 'vue'

const model = defineModel({ type: [String, Number], default: '' })
defineOptions({ inheritAttrs: false })
defineProps({
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
})
const id = useId()

// class/style go on the wrapper (layout), every other attribute on the <input>
const attrs = useAttrs()
const rootAttrs = computed(() => ({ class: attrs.class, style: attrs.style }))
const inputAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs
  return rest
})
</script>

<template>
  <label class="ui-field" :for="id" v-bind="rootAttrs">
    <span v-if="label" class="ui-field__label">{{ label }}</span>
    <input
      :id="id"
      v-model="model"
      v-bind="inputAttrs"
      :type="type"
      class="ui-field__input"
      :class="{ 'ui-field__input--error': error }"
      :aria-invalid="!!error || undefined"
      :aria-describedby="error || hint ? `${id}-msg` : undefined"
    />
    <span v-if="error || hint" :id="`${id}-msg`" class="ui-field__msg" :class="{ 'is-error': error }">
      {{ error || hint }}
    </span>
  </label>
</template>

<style scoped>
.ui-field { display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
.ui-field__label { font-weight: 600; color: var(--ui-text); }
.ui-field__input {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--ui-border);
  border-radius: calc(var(--ui-radius) - 2px);
  background: var(--ui-surface);
  color: var(--ui-text);
  font: inherit;
}
.ui-field__input:focus {
  outline: 3px solid color-mix(in srgb, var(--ui-primary) 30%, transparent);
  border-color: var(--ui-primary);
}
.ui-field__input--error { border-color: var(--ui-danger); }
.ui-field__msg { font-size: 12.5px; color: var(--ui-muted); }
.ui-field__msg.is-error { color: var(--ui-danger); }
</style>
