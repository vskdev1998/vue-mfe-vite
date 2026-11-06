<script setup>
const store = useShellAStore()
const query = ref(store.state.catalog.query)
let timer

watch(query, (q) => {
  clearTimeout(timer)
  timer = setTimeout(() => store.dispatch('catalog/fetch', q.trim()), 300)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="search">
    <input
      v-model="query"
      type="search"
      class="search__input"
      placeholder="Search products (e.g. phone, laptop)…"
      aria-label="Search products"
    />
  </div>
</template>

<style lang="scss" scoped>
.search {
  margin-bottom: 16px;

  &__input {
    width: 100%;
    padding: 12px 16px;
    border: 1px solid $border;
    border-radius: $radius;
    font: inherit;
    background: $surface;

    &:focus {
      outline: 2px solid soft($accent, 50%);
      border-color: $accent;
    }
  }
}
</style>
