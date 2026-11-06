<script setup>
/**
 * <UiButton variant="primary|secondary|ghost|danger" size="sm|md|lg" :loading block>
 */
import UiSpinner from './UiSpinner.vue'

defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  type: { type: String, default: 'button' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
})
</script>

<template>
  <button
    :type="type"
    class="ui-btn"
    :class="[`ui-btn--${variant}`, `ui-btn--${size}`, { 'ui-btn--block': block }]"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <UiSpinner v-if="loading" size="14" class="ui-btn__spinner" />
    <slot />
  </button>
</template>

<style scoped>
.ui-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: calc(var(--ui-radius) - 2px);
  font: inherit;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, opacity 0.15s, filter 0.15s;
}
.ui-btn:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--ui-primary) 40%, transparent);
  outline-offset: 2px;
}
.ui-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.ui-btn--sm { padding: 5px 10px; font-size: 13px; }
.ui-btn--md { padding: 9px 16px; font-size: 14px; }
.ui-btn--lg { padding: 12px 20px; font-size: 16px; }
.ui-btn--block { width: 100%; }

.ui-btn--primary { background: var(--ui-primary); color: var(--ui-primary-contrast); }
.ui-btn--primary:hover:not(:disabled) { filter: brightness(0.93); }
.ui-btn--secondary {
  background: color-mix(in srgb, var(--ui-primary) 10%, var(--ui-surface));
  border-color: color-mix(in srgb, var(--ui-primary) 45%, transparent);
  color: color-mix(in srgb, var(--ui-primary) 75%, var(--ui-text));
}
.ui-btn--secondary:hover:not(:disabled) { background: var(--ui-primary); color: var(--ui-primary-contrast); }
.ui-btn--ghost { background: transparent; border-color: var(--ui-border); color: inherit; }
.ui-btn--ghost:hover:not(:disabled) { background: color-mix(in srgb, currentColor 8%, transparent); }
.ui-btn--danger { background: var(--ui-danger); color: #fff; }
.ui-btn--danger:hover:not(:disabled) { filter: brightness(0.93); }
</style>
