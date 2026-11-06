<script setup>
const store = useShellBStore()
const filters = ['all', 'open', 'done']
const active = computed(() => store.state.tasks.filter)
const counts = computed(() => store.getters['tasks/counts'])
</script>

<template>
  <div class="filters" role="tablist" aria-label="Filter tasks">
    <button
      v-for="f in filters"
      :key="f"
      type="button"
      role="tab"
      :aria-selected="active === f"
      class="filters__btn"
      :class="{ 'filters__btn--active': active === f }"
      @click="store.commit('tasks/SET_FILTER', f)"
    >
      {{ f }} <span>{{ counts[f] }}</span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.filters {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;

  &__btn {
    padding: 6px 12px;
    border: 1px solid $border;
    border-radius: 999px;
    background: $surface;
    font: inherit;
    text-transform: capitalize;
    cursor: pointer;

    span {
      color: $muted;
      font-size: 12px;
    }

    &--active {
      background: $accent;
      border-color: $accent;
      color: #fff;

      span {
        color: soft($accent, 60%);
      }
    }
  }
}
</style>
