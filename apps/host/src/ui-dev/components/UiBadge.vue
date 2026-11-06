<script setup>
/** <UiBadge tone="primary|success|warning|danger|info|neutral">3</UiBadge> */
defineProps({ tone: { type: String, default: 'primary' } })
</script>

<template>
  <span class="ui-badge" :class="`ui-badge--${tone}`"><slot /></span>
</template>

<style scoped>
.ui-badge {
  --tone: var(--ui-primary);
  display: inline-flex;
  align-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--tone);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  justify-content: center;
  line-height: 1;
}
.ui-badge--success { --tone: var(--ui-success); }
.ui-badge--warning { --tone: var(--ui-warning); }
.ui-badge--danger { --tone: var(--ui-danger); }
.ui-badge--info { --tone: var(--ui-info); }
.ui-badge--neutral { --tone: var(--ui-muted); }
</style>
