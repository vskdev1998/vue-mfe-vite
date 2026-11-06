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
  <!-- UiInput / UiButton: host/ui-dev -->
  <form class="add" @submit.prevent="submit">
    <UiInput v-model="title" class="add__input" placeholder="What needs doing?" aria-label="New task" />
    <UiButton type="submit" :loading="saving" :disabled="!title.trim()">Add task</UiButton>
  </form>
</template>

<style lang="scss" scoped>
.add {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 12px;

  &__input {
    flex: 1;
    min-width: 0;
  }
}
</style>
