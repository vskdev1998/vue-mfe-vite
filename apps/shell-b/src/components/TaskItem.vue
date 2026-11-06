<script setup>
defineProps({ task: { type: Object, required: true } })
const store = useShellBStore()
</script>

<template>
  <li class="task" :class="{ 'task--done': task.done }">
    <label class="task__label">
      <input type="checkbox" :checked="task.done" @change="store.dispatch('tasks/toggle', task.id)" />
      <span>{{ task.title }}</span>
    </label>
    <UiButton variant="ghost" size="sm" aria-label="Delete task" @click="store.dispatch('tasks/remove', task.id)">
      🗑
    </UiButton>
  </li>
</template>

<style lang="scss" scoped>
.task {
  @include card;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;

  &__label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;

    input {
      accent-color: $accent;
      width: 18px;
      height: 18px;
    }
  }

  &--done span {
    color: $muted;
    text-decoration: line-through;
  }
}
</style>
