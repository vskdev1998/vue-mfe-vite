<script setup>
const store = useHostStore()
const displayName = computed(() => store.getters['auth/displayName'])
const role = computed(() => store.state.auth.user?.role ?? 'user')
const cartCount = computed(() => store.state.notifications.cartCount)
const openTasks = computed(() => store.state.notifications.openTasks)
const lastEvent = computed(() => store.state.notifications.lastEvent)
</script>

<template>
  <section class="page home">
    <h1>Welcome, {{ displayName }} 👋</h1>
    <p class="home__lead">
      This page belongs to the <strong>host</strong>. The cards below link to two independently
      built and deployed micro-frontends that are loaded at runtime with Module Federation.
    </p>

    <div class="home__grid">
      <StatCard label="Role (host store)" :value="role" />
      <StatCard label="Cart items (from shell-a)" :value="cartCount" to="/shell-a" />
      <StatCard label="Open tasks (from shell-b)" :value="openTasks ?? '—'" to="/shell-b" />
    </div>

    <h2>How the pieces talk</h2>
    <ul class="home__list">
      <li>Every app has its <strong>own Vuex store</strong> with its own injection key.</li>
      <li>Every app has its <strong>own axios instance</strong> (base URL, interceptors).</li>
      <li>
        Federation shares only <code>vue</code> (singleton) and the host's
        <strong>ui-dev</strong> component library (<code>host/ui-dev</code>). Cross-app data
        travels as <code>mfe:*</code> window events.
      </li>
    </ul>

    <p v-if="lastEvent" class="home__event">
      Last event: <code>{{ lastEvent }}</code>
    </p>
  </section>
</template>

<style lang="scss" scoped>
.home {
  &__lead {
    color: $muted;
    max-width: 70ch;
  }

  &__grid {
    display: grid;
    gap: 16px;
    margin: 24px 0 32px;
    grid-template-columns: 1fr;

    @include respond(sm) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__list li {
    margin-bottom: 6px;
  }

  &__event {
    font-size: 13px;
    color: $muted;
    word-break: break-all;
  }
}
</style>
