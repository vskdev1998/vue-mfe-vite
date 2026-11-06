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
  <!-- UiCard / UiBadge / UiButton: host/ui-dev -->
  <UiCard as="article" :padding="12" interactive class="product">
    <img :src="product.thumbnail" :alt="product.title" loading="lazy" class="product__img" />
    <UiBadge tone="neutral" class="product__cat">{{ product.category }}</UiBadge>
    <h3 class="product__title">{{ product.title }}</h3>
    <div class="product__row">
      <strong>{{ price }}</strong>
      <span class="product__rating">★ {{ product.rating?.toFixed(1) }}</span>
    </div>
    <UiButton variant="secondary" block @click="store.dispatch('cart/add', product)">
      Add to cart
    </UiButton>
  </UiCard>
</template>

<style lang="scss" scoped>
.product {
  &__img {
    width: calc(100% + 24px);
    margin: -12px -12px 4px;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    background: soft($accent, 92%);
  }

  &__cat {
    align-self: flex-start;
    text-transform: uppercase;
    font-size: 10.5px;
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
}
</style>
