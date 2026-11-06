<script setup>
const props = defineProps({
  product: { type: Object, required: true },
})
const store = useShellAStore()
const price = computed(() =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(props.product.price),
)
</script>

<template>
  <article class="product">
    <img :src="product.thumbnail" :alt="product.title" loading="lazy" class="product__img" />
    <div class="product__body">
      <span class="product__cat">{{ product.category }}</span>
      <h3 class="product__title">{{ product.title }}</h3>
      <div class="product__row">
        <strong>{{ price }}</strong>
        <span class="product__rating">★ {{ product.rating?.toFixed(1) }}</span>
      </div>
      <button type="button" class="product__add" @click="store.dispatch('cart/add', product)">
        Add to cart
      </button>
    </div>
  </article>
</template>

<style lang="scss" scoped>
.product {
  @include card;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &__img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    background: soft($accent, 92%);
  }

  &__body {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  &__cat {
    font-size: 11px;
    text-transform: uppercase;
    color: $accent;
    font-weight: 700;
  }

  &__title {
    margin: 0;
    font-size: 15px;
  }

  &__row {
    display: flex;
    justify-content: space-between;
    margin-top: auto;
  }

  &__rating {
    color: #d97706;
    font-size: 13px;
  }

  &__add {
    padding: 8px;
    border: 1px solid $accent;
    border-radius: 8px;
    background: soft($accent, 94%);
    color: $accent-dark;
    font: inherit;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      background: $accent;
      color: #fff;
    }
  }
}
</style>
