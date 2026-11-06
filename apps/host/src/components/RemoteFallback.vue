<script setup>
defineProps({
  label: { type: String, required: true },
  state: { type: String, default: 'loading' }, // loading | error
  error: { type: [Error, Object, String], default: null },
})
</script>

<template>
  <UiCard class="remote-fallback" :padding="32">
    <template v-if="state === 'loading'">
      <UiSpinner size="28" :label="`Loading ${label}`" class="remote-fallback__spinner" />
      <p>Loading <strong>{{ label }}</strong>…</p>
    </template>
    <UiAlert v-else tone="danger" :title="`${label} is unavailable`">
      <p class="remote-fallback__hint">
        Make sure the remote dev server is running (<code>npm run dev</code> at the repo root
        starts all three apps).
      </p>
      <pre v-if="error" class="remote-fallback__error">{{ error?.message || error }}</pre>
    </UiAlert>
  </UiCard>
</template>

<style lang="scss" scoped>
.remote-fallback {
  text-align: center;
  color: $muted;

  &__spinner {
    align-self: center;
  }

  &__hint {
    margin: 4px 0;
  }

  &__error {
    text-align: left;
    white-space: pre-wrap;
    font-size: 12px;
    background: $surface;
    padding: 12px;
    border-radius: 6px;
  }
}
</style>
