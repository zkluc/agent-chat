<template>
  <component
    :is="blockComponent"
    v-if="blockComponent"
    :block="block"
  />
  <div v-else class="unknown-block">
    <span>未知块类型: {{ block.type }}</span>
    <pre>{{ block.content }}</pre>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { blockRegistry } from '@/registry'

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

const blockComponent = computed(() => blockRegistry.get(props.block.type))
</script>

<style scoped>
.unknown-block {
  padding: 8px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary, #999);
}
.unknown-block pre {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 11px;
  margin-top: 4px;
}
</style>
