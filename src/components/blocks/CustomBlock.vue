<template>
  <div class="custom-block">
    <div class="custom-label">{{ block.meta?.name || '自定义' }}</div>
    <pre class="custom-value">{{ formattedValue }}</pre>
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

const formattedValue = computed(() => {
  const val = props.block.meta?.value
  if (val && typeof val === 'object') return JSON.stringify(val, null, 2)
  return props.block.content || String(val || '')
})
</script>

<style scoped>
.custom-block {
  border: 1px dashed var(--custom-border, #d1d5db);
  border-radius: 8px;
  padding: 10px 14px;
  margin: 6px 0;
}
.custom-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary, #999);
  margin-bottom: 6px;
  text-transform: uppercase;
}
.custom-value {
  font-size: 12px;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
