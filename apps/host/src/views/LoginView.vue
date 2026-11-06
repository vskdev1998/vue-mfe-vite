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
    <form class="login__card" novalidate @submit.prevent="onSubmit">
      <img src="/favicon.svg" alt="" width="48" height="48" class="login__logo" />
      <h1>Sign in</h1>
      <p class="login__subtitle">Host app · Vue 3 + Vite 7 micro-frontends</p>

      <label class="field">
        <span>Username</span>
        <input v-model.trim="form.username" autocomplete="username" required />
      </label>

      <label class="field">
        <span>Password</span>
        <input v-model="form.password" type="password" autocomplete="current-password" required />
      </label>

      <p v-if="error" class="login__error" role="alert">{{ error }}</p>

      <button class="btn btn--primary login__submit" type="submit" :disabled="loading">
        {{ loading ? 'Signing in…' : 'Sign in' }}
      </button>

      <p class="login__hint">
        <template v-if="useMock">
          Demo accounts: <code>demo / demo123</code> or <code>guest / guest123</code>
        </template>
        <template v-else>Live API (dummyjson): <code>emilys / emilyspass</code></template>
      </p>
    </form>
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
    @include card;
    width: 100%;
    max-width: 380px;
    padding: 32px 28px;
    display: flex;
    flex-direction: column;
    gap: 14px;
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

  &__error {
    margin: 0;
    padding: 8px 12px;
    border-radius: 6px;
    background: tint($danger, 90%);
    color: $danger;
    font-size: 14px;
  }

  &__submit {
    justify-content: center;
    padding: 10px;
  }

  &__hint {
    margin: 0;
    font-size: 13px;
    color: $muted;
    text-align: center;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;

  input {
    padding: 10px 12px;
    border: 1px solid $border;
    border-radius: 8px;
    font: inherit;
    font-weight: 400;

    &:focus {
      outline: 2px solid tint($brand, 40%);
      border-color: $brand;
    }
  }
}
</style>
