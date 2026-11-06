<script setup>
// Auto-imported: computed, onMounted, onBeforeUnmount, useRoute, useHostStore, onMfeEvent
// <AppHeader> is auto-registered by unplugin-vue-components
const route = useRoute()
const store = useHostStore()
const showChrome = computed(() => route.meta.layout !== 'blank')

// Listen to events published by the remotes (loose coupling, no shared store)
const unsubscribers = []
onMounted(() => {
  unsubscribers.push(
    onMfeEvent('cart-updated', ({ count }) => {
      store.commit('notifications/SET_CART_COUNT', count)
      store.commit('notifications/SET_LAST_EVENT', { from: 'shell-a', at: Date.now(), count })
    }),
    onMfeEvent('tasks-updated', ({ open, total }) => {
      store.commit('notifications/SET_OPEN_TASKS', open)
      store.commit('notifications/SET_LAST_EVENT', { from: 'shell-b', at: Date.now(), open, total })
    }),
  )
})
onBeforeUnmount(() => unsubscribers.forEach((off) => off()))
</script>

<template>
  <div class="host-app">
    <AppHeader v-if="showChrome" />
    <main class="host-app__main">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style lang="scss">
.host-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;

  &__main {
    flex: 1;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
