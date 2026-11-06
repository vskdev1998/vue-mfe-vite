<script setup>
defineProps({
  label: { type: String, required: true },
  state: { type: String, default: 'loading' }, // loading | error
  error: { type: [Error, Object, String], default: null },
})
</script>

<template>
  <div class="remote-fallback" :class="`remote-fallback--${state}`" role="status">
    <template v-if="state === 'loading'">
      <span class="remote-fallback__spinner" aria-hidden="true" />
      <p>Loading <strong>{{ label }}</strong>…</p>
    </template>
    <template v-else>
      <p class="remote-fallback__title">⚠️ {{ label }} is unavailable</p>
      <p class="remote-fallback__hint">
        Make sure the remote dev server is running (<code>npm run dev</code> at the repo root
        starts all three apps).
      </p>
      <pre v-if="error" class="remote-fallback__error">{{ error?.message || error }}</pre>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.remote-fallback {
  @include card;
  padding: 32px;
  text-align: center;
  color: $muted;

  &--error {
    border-color: tint($danger, 60%);
    background: tint($danger, 95%);
  }

  &__spinner {
    display: inline-block;
    width: 28px;
    height: 28px;
    border: 3px solid $border;
    border-top-color: $brand;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__title {
    color: $danger;
    font-weight: 700;
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

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
