<script setup>
// Exposed as `shellA/App`. This is the remote's root component and its public API.
// Auto-imported: provide, onMounted, ref, computed, useShellAStore
import { store, shellAStoreKey } from '@/store'

const props = defineProps({
  /** Signed-in user passed by the host */
  user: { type: Object, default: null },
  standalone: { type: Boolean, default: false },
})

// Make shell-a's own store available to its subtree, even when rendered inside the host app
provide(shellAStoreKey, store)

const cartOpen = ref(false)
const cartCount = computed(() => store.getters['cart/count'])

onMounted(() => {
  if (!store.state.catalog.items.length) store.dispatch('catalog/fetch')
})
</script>

<template>
  <div class="shell-a">
    <header class="shell-a__header">
      <div>
        <p class="shell-a__eyebrow">Micro-frontend · shell-a</p>
        <h1 class="shell-a__title">Product catalog</h1>
        <p v-if="props.user" class="shell-a__hello">
          Shopping as <strong>{{ props.user.firstName }}</strong>
        </p>
      </div>
      <!-- <UiButton> is auto-imported from the host's ui-dev library (host/ui-dev) -->
      <UiButton @click="cartOpen = !cartOpen">🛒 Cart ({{ cartCount }})</UiButton>
    </header>

    <SearchBar />
    <CartPanel v-if="cartOpen" @close="cartOpen = false" />
    <ProductGrid />
  </div>
</template>

<style lang="scss" scoped>
// Everything is scoped under .shell-a so styles never bleed into the host.
.shell-a {
  // Theme the shared ui-dev components for this micro-frontend
  --ui-primary: #{$accent};
  --ui-border: #{$border};
  --ui-text: #{$text};
  color: $text;

  &__header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
    margin-bottom: 16px;
  }

  &__eyebrow {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: $accent;
  }

  &__title {
    margin: 4px 0;
  }

  &__hello {
    margin: 0;
    color: $muted;
  }
}
</style>
