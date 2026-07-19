<template>
  <div class="hint-block">
    <span class="hint-source" v-if="block.meta?.source">{{ block.meta.source }}</span>
    <span class="hint-content">{{ hintContent }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  block: {
    id: string
    type: string
    content: string
    streaming: boolean
    complete: boolean
    meta?: Record<string, unknown>
  }
}>()

const hintContent = computed(() => {
  const hint = props.block.meta?.hint
  if (typeof hint === 'string') return hint
  return props.block.content
})
</script>

<style scoped>
.hint-block {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: var(--hint-bg, #eff6ff);
  border: 1px solid var(--hint-border, #bfdbfe);
  font-size: 12px;
  color: var(--hint-color, #2563eb);
  margin: 4px 0;
}
.hint-source {
  font-weight: 600;
}
</style>
