<script setup>
// `shellA/App` is resolved at RUNTIME from VITE_SHELL_A_ENTRY (see vite.config.js).
const ShellA = defineRemoteComponent(() => import('shellA/App'), 'Shell A (catalog)')

const store = useHostStore()
const user = computed(() => store.state.auth.user)
</script>

<template>
  <section class="page">
    <!-- Props are the "public API" of the remote. Keep them small and serialisable. -->
    <ShellA :user="user" />
  </section>
</template>
