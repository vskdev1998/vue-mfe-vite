<script setup>
const store = useShellAStore()
const query = ref(store.state.catalog.query)
let timer

watch(query, (q) => {
  clearTimeout(timer)
  timer = setTimeout(() => store.dispatch('catalog/fetch', String(q).trim()), 300)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="search">
    <UiInput
      v-model="query"
      type="search"
      placeholder="Search products (e.g. phone, laptop)…"
      aria-label="Search products"
    />
  </div>
</template>

<style lang="scss" scoped>
.search {
  margin-bottom: 16px;
}
</style>
