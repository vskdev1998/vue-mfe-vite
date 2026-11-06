<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  to: { type: String, default: '' },
})
</script>

<template>
  <component :is="to ? 'RouterLink' : 'div'" :to="to || undefined" class="stat-card">
    <span class="stat-card__label">{{ label }}</span>
    <span class="stat-card__value">{{ value }}</span>
    <slot />
  </component>
</template>

<style lang="scss" scoped>
.stat-card {
  @include card;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px;
  color: inherit;
  text-decoration: none;
  transition: transform 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
  }

  &__label {
    color: $muted;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__value {
    font-size: 28px;
    font-weight: 800;
    color: $brand-dark;
  }
}
</style>
