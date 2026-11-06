<script setup>
// Exposed as `shellB/App`. Auto-imported: provide, computed, onMounted
import { store, shellBStoreKey } from '@/store'

const props = defineProps({
  user: { type: Object, default: null },
  standalone: { type: Boolean, default: false },
})

provide(shellBStoreKey, store)

const counts = computed(() => store.getters['tasks/counts'])
const progress = computed(() =>
  counts.value.all ? Math.round((counts.value.done / counts.value.all) * 100) : 0,
)

onMounted(() => {
  if (!store.state.tasks.items.length) store.dispatch('tasks/fetch')
})
</script>

<template>
  <div class="shell-b">
    <header class="shell-b__header">
      <p class="shell-b__eyebrow">Micro-frontend · shell-b</p>
      <h1 class="shell-b__title">Task board</h1>
      <p v-if="props.user" class="shell-b__hello">
        Tasks for <strong>{{ props.user.firstName }} {{ props.user.lastName }}</strong>
      </p>
      <div class="shell-b__progress" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
        <span :style="{ width: progress + '%' }" />
      </div>
      <small>{{ progress }}% complete · {{ counts.open }} open</small>
    </header>

    <AddTaskForm />
    <TaskFilters />
    <TaskList />
  </div>
</template>

<style lang="scss" scoped>
.shell-b {
  // Theme the shared ui-dev components for this micro-frontend
  --ui-primary: #{$accent};
  --ui-border: #{$border};
  --ui-text: #{$text};
  color: $text;

  &__header {
    margin-bottom: 16px;
  }

  &__eyebrow {
    margin: 0;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: $accent;
  }

  &__title {
    margin: 4px 0;
  }

  &__hello {
    margin: 0 0 12px;
    color: $muted;
  }

  &__progress {
    height: 8px;
    border-radius: 999px;
    background: soft($accent, 85%);
    overflow: hidden;

    span {
      display: block;
      height: 100%;
      background: $accent;
      transition: width 0.3s ease;
    }
  }
}
</style>
