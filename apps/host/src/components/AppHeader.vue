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
        <UiBadge v-if="cartCount" :aria-label="`${cartCount} items in cart`">{{ cartCount }}</UiBadge>
      </RouterLink>
      <RouterLink to="/shell-b">
        Shell B
        <UiBadge v-if="openTasks" tone="warning">{{ openTasks }}</UiBadge>
      </RouterLink>
    </nav>

    <div class="app-header__user">
      <span class="app-header__name">👤 {{ displayName }}</span>
      <UiButton variant="ghost" size="sm" class="app-header__logout" @click="logout">Logout</UiButton>
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
  }

  &__logout {
    color: #fff;
    border-color: rgba(255, 255, 255, 0.3);
  }

  &__name {
    font-size: 14px;
  }
}

:deep(.ui-badge) {
  margin-left: 4px;
}
</style>
