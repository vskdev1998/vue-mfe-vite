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
    <button type="button" class="task__del" aria-label="Delete task" @click="store.dispatch('tasks/remove', task.id)">
      🗑
    </button>
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

  &__del {
    border: 0;
    background: none;
    cursor: pointer;
    opacity: 0.5;

    &:hover {
      opacity: 1;
    }
  }
}
</style>
