<template>
  <div class="tool-call-block" :class="{ streaming: block.streaming }">
    <div class="tool-call-header">
      <span class="tool-icon">🔧</span>
      <span class="tool-name">{{ block.meta?.name || '工具调用' }}</span>
      <el-tag size="small" :type="tagType">{{ stateLabel }}</el-tag>
    </div>
    <div class="tool-call-input">
      <div class="input-label">参数:</div>
      <pre class="input-json">{{ formattedInput }}</pre>
    </div>
    <div v-if="block.streaming" class="tool-call-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>执行中...</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Loading } from '@element-plus/icons-vue'

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

const formattedInput = computed(() => {
  const input = (props.block.meta?.input as string) || props.block.content || ''
  try {
    return JSON.stringify(JSON.parse(input), null, 2)
  } catch {
    return input
  }
})

const stateLabel = computed(() => {
  if (props.block.streaming) return '执行中'
  return '已完成'
})

const tagType = computed(() => {
  if (props.block.streaming) return 'warning'
  return 'success'
})
</script>

<style scoped>
.tool-call-block {
  border: 1px solid var(--tool-border, #e3e8f0);
  border-radius: 8px;
  padding: 10px 14px;
  margin: 6px 0;
  background: var(--tool-bg, #f8fafc);
}
.tool-call-block.streaming {
  border-color: var(--tool-streaming-border, #f59e0b);
}
.tool-call-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.tool-icon { font-size: 14px; }
.tool-name {
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary, #333);
}
.tool-call-input {
  background: var(--code-bg, #1e1e2e);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
}
.input-label {
  color: var(--text-secondary, #999);
  margin-bottom: 4px;
  font-size: 11px;
}
.input-json {
  margin: 0;
  color: var(--code-color, #e0e0e0);
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
.tool-call-loading {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--tool-streaming-color, #f59e0b);
}
</style>
