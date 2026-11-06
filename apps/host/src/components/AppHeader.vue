<script setup>
// Auto-imported: computed, useRouter (vue-router), useHostStore (src/composables)
const store = useHostStore()
const router = useRouter()

const displayName = computed(() => store.getters['auth/displayName'])
const cartCount = computed(() => store.state.notifications.cartCount)
const openTasks = computed(() => store.state.notifications.openTasks)

function logout() {
  store.dispatch('auth/logout')
  router.push({ name: 'login' })
}
</script>

<template>
  <header class="app-header">
    <RouterLink to="/" class="app-header__brand">
      <img src="/favicon.svg" alt="" width="28" height="28" />
      <span>Vue MFE</span>
    </RouterLink>

    <nav class="app-header__nav" aria-label="Main">
      <RouterLink to="/">Dashboard</RouterLink>
      <RouterLink to="/shell-a">
        Shell A
        <span v-if="cartCount" class="badge" :aria-label="`${cartCount} items in cart`">{{
          cartCount
        }}</span>
      </RouterLink>
      <RouterLink to="/shell-b">
        Shell B
        <span v-if="openTasks" class="badge badge--alt">{{ openTasks }}</span>
      </RouterLink>
    </nav>

    <div class="app-header__user">
      <span class="app-header__name">👤 {{ displayName }}</span>
      <button class="btn btn--ghost" type="button" @click="logout">Logout</button>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 24px;
  min-height: $header-height;
  padding: 8px 16px;
  background: $brand-dark;
  color: #fff;

  @include respond(md) {
    padding: 0 24px;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #fff;
    font-weight: 800;
    text-decoration: none;
  }

  &__nav {
    display: flex;
    gap: 4px;
    order: 3;
    width: 100%;

    @include respond(md) {
      order: 0;
      width: auto;
      flex: 1;
    }

    a {
      padding: 6px 12px;
      border-radius: 6px;
      color: tint($brand-dark, 70%);
      text-decoration: none;
      font-weight: 600;

      &:hover {
        color: #fff;
      }

      &.router-link-exact-active {
        background: rgba(255, 255, 255, 0.12);
        color: #fff;
      }
    }
  }

  &__user {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 12px;

    .btn--ghost {
      color: #fff;
      border-color: rgba(255, 255, 255, 0.3);
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }

  &__name {
    font-size: 14px;
  }
}

.badge {
  display: inline-block;
  min-width: 20px;
  padding: 0 6px;
  margin-left: 4px;
  border-radius: 999px;
  background: $brand;
  color: #fff;
  font-size: 12px;
  line-height: 20px;
  text-align: center;

  &--alt {
    background: #f59e0b;
  }
}
</style>
