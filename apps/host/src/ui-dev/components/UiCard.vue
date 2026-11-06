<script setup>
/** <UiCard :padding="16" interactive as="article"> with optional #header / #footer slots */
defineProps({
  as: { type: String, default: 'div' },
  padding: { type: [Number, String], default: 20 },
  interactive: { type: Boolean, default: false },
})
</script>

<template>
  <component
    :is="as"
    class="ui-card"
    :class="{ 'ui-card--interactive': interactive }"
    :style="{ '--ui-card-pad': `${padding}px` }"
  >
    <header v-if="$slots.header" class="ui-card__header"><slot name="header" /></header>
    <div class="ui-card__body"><slot /></div>
    <footer v-if="$slots.footer" class="ui-card__footer"><slot name="footer" /></footer>
  </component>
</template>

<style scoped>
.ui-card {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background: var(--ui-surface);
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  color: var(--ui-text);
  overflow: hidden;
}
.ui-card--interactive { transition: transform 0.15s, box-shadow 0.15s; }
.ui-card--interactive:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0, 0, 0, 0.07); }
.ui-card__header,
.ui-card__footer { padding: 12px var(--ui-card-pad); border-color: var(--ui-border); }
.ui-card__header { border-bottom: 1px solid var(--ui-border); font-weight: 700; }
.ui-card__footer { border-top: 1px solid var(--ui-border); }
.ui-card__body { padding: var(--ui-card-pad); flex: 1; display: flex; flex-direction: column; gap: 8px; }
</style>
