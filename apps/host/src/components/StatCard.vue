<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], default: '—' },
  to: { type: String, default: '' },
})
</script>

<template>
  <RouterLink v-if="to" :to="to" class="stat-card-link">
    <UiCard interactive>
      <span class="stat-card__label">{{ label }}</span>
      <span class="stat-card__value">{{ value }}</span>
    </UiCard>
  </RouterLink>
  <UiCard v-else>
    <span class="stat-card__label">{{ label }}</span>
    <span class="stat-card__value">{{ value }}</span>
  </UiCard>
</template>

<style lang="scss" scoped>
.stat-card-link {
  color: inherit;
  text-decoration: none;
}

.stat-card {
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
