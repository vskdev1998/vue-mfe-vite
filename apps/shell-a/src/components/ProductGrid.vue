<script setup>
const store = useShellAStore()
const catalog = computed(() => store.state.catalog)
const isEmpty = computed(() => store.getters['catalog/isEmpty'])
const retry = () => store.dispatch('catalog/fetch')
</script>

<template>
  <div>
    <UiAlert v-if="catalog.error" tone="danger" title="Could not load products" class="grid-msg">
      {{ catalog.error }} <UiButton size="sm" variant="ghost" @click="retry">Retry</UiButton>
    </UiAlert>
    <p v-else-if="catalog.loading && !catalog.items.length" class="grid-msg">
      <UiSpinner size="18" /> Loading products…
    </p>
    <p v-else-if="isEmpty" class="grid-msg">No products match “{{ catalog.query }}”.</p>

    <div class="grid" :class="{ 'grid--busy': catalog.loading }">
      <ProductCard v-for="p in catalog.items" :key="p.id" :product="p" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  transition: opacity 0.2s;

  &--busy {
    opacity: 0.5;
  }
}

.grid-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: $muted;
}
</style>
