<script setup>
// Auto-imported: reactive, computed, useRoute, useRouter, useHostStore
const store = useHostStore()
const route = useRoute()
const router = useRouter()

const useMock = import.meta.env.VITE_USE_MOCK_AUTH !== 'false'
const form = reactive({
  username: useMock ? 'demo' : 'emilys',
  password: useMock ? 'demo123' : 'emilyspass',
})
const loading = computed(() => store.state.auth.status === 'loading')
const error = computed(() => store.state.auth.error)

async function onSubmit() {
  try {
    await store.dispatch('auth/login', { ...form })
    router.replace(route.query.redirect || { name: 'home' })
  } catch {
    /* error is shown from the store */
  }
}
</script>

<template>
  <section class="login">
    <!-- UiCard / UiInput / UiAlert / UiButton come from the host's ui-dev library -->
    <UiCard as="form" class="login__card" :padding="28" novalidate @submit.prevent="onSubmit">
      <img src="/favicon.svg" alt="" width="48" height="48" class="login__logo" />
      <h1>Sign in</h1>
      <p class="login__subtitle">Host app · Vue 3 + Vite 7 micro-frontends</p>

      <UiInput v-model.trim="form.username" label="Username" autocomplete="username" required />
      <UiInput
        v-model="form.password"
        label="Password"
        type="password"
        autocomplete="current-password"
        required
      />

      <UiAlert v-if="error" tone="danger">{{ error }}</UiAlert>

      <UiButton type="submit" size="lg" block :loading="loading">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </UiButton>

      <p class="login__hint">
        <template v-if="useMock">
          Demo accounts: <code>demo / demo123</code> or <code>guest / guest123</code>
        </template>
        <template v-else>Live API (dummyjson): <code>emilys / emilyspass</code></template>
      </p>
    </UiCard>
  </section>
</template>

<style lang="scss" scoped>
.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 16px;
  background: linear-gradient(135deg, tint($brand, 85%), tint($brand-dark, 85%));

  &__card {
    width: 100%;
    max-width: 380px;

    :deep(.ui-card__body) {
      gap: 14px;
    }
  }

  &__logo {
    align-self: center;
  }

  h1 {
    margin: 0;
    text-align: center;
  }

  &__subtitle {
    margin: -8px 0 8px;
    text-align: center;
    color: $muted;
    font-size: 14px;
  }

  &__hint {
    margin: 0;
    font-size: 13px;
    color: $muted;
    text-align: center;
  }
}
</style>
