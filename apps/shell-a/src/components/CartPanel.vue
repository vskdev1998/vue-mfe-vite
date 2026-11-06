<script setup>
const emit = defineEmits(['close'])
const store = useShellAStore()
const lines = computed(() => store.state.cart.lines)
const total = computed(() => store.getters['cart/total'].toFixed(2))
</script>

<template>
  <aside class="cart" aria-label="Cart">
    <div class="cart__head">
      <h2>Your cart</h2>
      <button type="button" class="cart__x" aria-label="Close cart" @click="emit('close')">✕</button>
    </div>
    <p v-if="!lines.length" class="cart__empty">Cart is empty.</p>
    <ul v-else class="cart__list">
      <li v-for="l in lines" :key="l.id">
        <span>{{ l.title }} × {{ l.qty }}</span>
        <button type="button" @click="store.dispatch('cart/remove', l.id)">Remove</button>
      </li>
    </ul>
    <div v-if="lines.length" class="cart__foot">
      <strong>Total: ${{ total }}</strong>
      <button type="button" @click="store.dispatch('cart/clear')">Clear</button>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.cart {
  @include card;
  padding: 16px;
  margin-bottom: 16px;
  border-color: $accent;

  &__head {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 {
      margin: 0;
      font-size: 18px;
    }
  }

  &__x {
    border: 0;
    background: none;
    font-size: 18px;
    cursor: pointer;
  }

  &__empty {
    color: $muted;
  }

  &__list {
    list-style: none;
    padding: 0;

    li {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 6px 0;
      border-bottom: 1px dashed $border;
    }
  }

  &__foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  button:not(.cart__x) {
    border: 1px solid $border;
    background: $surface;
    border-radius: 6px;
    padding: 4px 10px;
    cursor: pointer;
  }
}
</style>
