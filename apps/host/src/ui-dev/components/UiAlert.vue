<script setup>
/** <UiAlert tone="info|success|warning|danger" title="…" dismissible @dismiss> */
defineProps({
  tone: { type: String, default: 'info' },
  title: { type: String, default: '' },
  dismissible: { type: Boolean, default: false },
})
defineEmits(['dismiss'])
</script>

<template>
  <div class="ui-alert" :class="`ui-alert--${tone}`" :role="tone === 'danger' ? 'alert' : 'status'">
    <div class="ui-alert__content">
      <strong v-if="title" class="ui-alert__title">{{ title }}</strong>
      <div><slot /></div>
    </div>
    <button v-if="dismissible" type="button" class="ui-alert__x" aria-label="Dismiss" @click="$emit('dismiss')">✕</button>
  </div>
</template>

<style scoped>
.ui-alert {
  --tone: var(--ui-info);
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--tone) 35%, transparent);
  border-radius: calc(var(--ui-radius) - 2px);
  background: color-mix(in srgb, var(--tone) 9%, var(--ui-surface));
  color: color-mix(in srgb, var(--tone) 70%, var(--ui-text));
  font-size: 14px;
}
.ui-alert--success { --tone: var(--ui-success); }
.ui-alert--warning { --tone: var(--ui-warning); }
.ui-alert--danger { --tone: var(--ui-danger); }
.ui-alert__content { flex: 1; min-width: 0; }
.ui-alert__title { display: block; margin-bottom: 2px; }
.ui-alert__x { border: 0; background: none; color: inherit; cursor: pointer; font-size: 14px; }
</style>
