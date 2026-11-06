<script setup>
const emit = defineEmits(['close'])
const store = useShellAStore()
const lines = computed(() => store.state.cart.lines)
const total = computed(() => store.getters['cart/total'].toFixed(2))
</script>

<template>
  <UiCard as="aside" aria-label="Cart" class="cart">
    <template #header>
      <div class="cart__head">
        <span>Your cart</span>
        <UiButton variant="ghost" size="sm" aria-label="Close cart" @click="emit('close')">✕</UiButton>
      </div>
    </template>

    <p v-if="!lines.length" class="cart__empty">Cart is empty.</p>
    <ul v-else class="cart__list">
      <li v-for="l in lines" :key="l.id">
        <span>{{ l.title }} <UiBadge tone="neutral">× {{ l.qty }}</UiBadge></span>
        <UiButton variant="ghost" size="sm" @click="store.dispatch('cart/remove', l.id)">Remove</UiButton>
      </li>
    </ul>

    <template v-if="lines.length" #footer>
      <div class="cart__foot">
        <strong>Total: ${{ total }}</strong>
        <UiButton variant="danger" size="sm" @click="store.dispatch('cart/clear')">Clear</UiButton>
      </div>
    </template>
  </UiCard>
</template>

<style lang="scss" scoped>
.cart {
  margin-bottom: 16px;
  border-color: $accent;

  &__head,
  &__foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__empty {
    margin: 0;
    color: $muted;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;

    li {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px dashed $border;
    }
  }
}
</style>
