<script setup>
const store = useShellAStore()
const query = ref(store.state.catalog.query)
// lodash (auto-imported as `_`): one request 300 ms after the user stops typing
const search = _.debounce((q) => store.dispatch('catalog/fetch', _.trim(q)), 300)

watch(query, search)
onBeforeUnmount(() => search.cancel())
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
