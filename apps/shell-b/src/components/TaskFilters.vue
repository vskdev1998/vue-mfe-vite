<script setup>
const store = useShellBStore()
const filters = ['all', 'open', 'done']
const active = computed(() => store.state.tasks.filter)
const counts = computed(() => store.getters['tasks/counts'])
</script>

<template>
  <div class="filters" role="tablist" aria-label="Filter tasks">
    <UiButton
      v-for="f in filters"
      :key="f"
      role="tab"
      size="sm"
      :aria-selected="active === f"
      :variant="active === f ? 'primary' : 'ghost'"
      class="filters__btn"
      @click="store.commit('tasks/SET_FILTER', f)"
    >
      {{ f }} <UiBadge :tone="active === f ? 'neutral' : 'primary'">{{ counts[f] }}</UiBadge>
    </UiButton>
  </div>
</template>

<style lang="scss" scoped>
.filters {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;

  &__btn {
    text-transform: capitalize;
    border-radius: 999px;
  }
}
</style>
