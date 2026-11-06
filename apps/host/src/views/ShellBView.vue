<script setup>
const ShellB = defineRemoteComponent(() => import('shellB/App'), 'Shell B (tasks)')

const store = useHostStore()
const user = computed(() => store.state.auth.user)
</script>

<template>
  <section class="page">
    <ShellB :user="user" />
  </section>
</template>
