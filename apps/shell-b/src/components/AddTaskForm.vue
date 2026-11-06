<script setup>
const store = useShellBStore()
const title = ref('')
const saving = ref(false)

async function submit() {
  if (!title.value.trim()) return
  saving.value = true
  try {
    await store.dispatch('tasks/add', title.value.trim())
    title.value = ''
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="add" @submit.prevent="submit">
    <input v-model="title" class="add__input" placeholder="What needs doing?" aria-label="New task" />
    <button class="add__btn" type="submit" :disabled="saving || !title.trim()">
      {{ saving ? 'Adding…' : 'Add task' }}
    </button>
  </form>
</template>

<style lang="scss" scoped>
.add {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;

  &__input {
    flex: 1;
    min-width: 0;
    padding: 10px 14px;
    border: 1px solid $border;
    border-radius: $radius;
    font: inherit;

    &:focus {
      outline: 2px solid soft($accent, 50%);
      border-color: $accent;
    }
  }

  &__btn {
    padding: 10px 16px;
    border: 0;
    border-radius: $radius;
    background: $accent;
    color: #fff;
    font: inherit;
    font-weight: 700;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
