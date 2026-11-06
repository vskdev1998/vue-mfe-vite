<script setup>
/** <UiSpinner size="24" label="Loading" /> */
defineProps({
  size: { type: [Number, String], default: 24 },
  label: { type: String, default: 'Loading' },
})
</script>

<template>
  <span
    class="ui-spinner"
    role="status"
    :aria-label="label"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
</template>

<style scoped>
.ui-spinner {
  display: inline-block;
  flex: none;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, currentColor 20%, transparent);
  border-top-color: var(--ui-primary);
  animation: ui-spin 0.8s linear infinite;
}
@keyframes ui-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .ui-spinner { animation-duration: 2.4s; } }
</style>
