<script setup>
const store = useShellBStore()
const state = computed(() => store.state.tasks)
const visible = computed(() => store.getters['tasks/visible'])
</script>

<template>
  <div>
    <UiAlert v-if="state.error" tone="danger" title="Could not load tasks" class="msg">
      {{ state.error }}
      <UiButton size="sm" variant="ghost" @click="store.dispatch('tasks/fetch')">Retry</UiButton>
    </UiAlert>
    <p v-else-if="state.loading" class="msg"><UiSpinner size="18" /> Loading tasks…</p>
    <p v-else-if="!visible.length" class="msg">Nothing here.</p>

    <TransitionGroup tag="ul" name="list" class="list">
      <TaskItem v-for="t in visible" :key="t.id" :task="t" />
    </TransitionGroup>
  </div>
</template>

<style lang="scss" scoped>
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.msg {
  display: flex;
  align-items: center;
  gap: 8px;
  color: $muted;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
