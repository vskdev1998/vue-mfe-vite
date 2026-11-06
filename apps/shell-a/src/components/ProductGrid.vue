<script setup>
const store = useShellAStore()
const catalog = computed(() => store.state.catalog)
const isEmpty = computed(() => store.getters['catalog/isEmpty'])
const retry = () => store.dispatch('catalog/fetch')
</script>

<template>
  <div>
    <p v-if="catalog.error" class="grid-msg grid-msg--error">
      {{ catalog.error }} <button type="button" @click="retry">Retry</button>
    </p>
    <p v-else-if="catalog.loading && !catalog.items.length" class="grid-msg">Loading products…</p>
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
  padding: 16px;
  color: $muted;

  &--error {
    color: #b91c1c;
  }
}
</style>
