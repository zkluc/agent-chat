<template>
  <div class="tool-call-block" :class="stateClass">
    <div class="tool-call-header">
      <span class="tool-icon">{{ stateIcon }}</span>
      <span class="tool-name">{{ block.meta?.name || '工具调用' }}</span>
      <el-tag size="small" :type="tagType">{{ stateLabel }}</el-tag>
    </div>
    <div class="tool-call-input">
      <div class="input-label">参数:</div>
      <pre class="input-json">{{ formattedInput }}</pre>
    </div>
    <div v-if="block.meta?.toolState === 'running'" class="tool-call-loading">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>执行中...</span>
    </div>
    <div v-else-if="block.meta?.toolResult" class="tool-call-result">
      <div class="result-label">结果:</div>
      <pre class="result-json">{{ formattedResult }}</pre>
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

const formattedResult = computed(() => {
  const result = props.block.meta?.toolResult as string
  if (!result) return ''
  try {
    return JSON.stringify(JSON.parse(result), null, 2)
  } catch {
    return result
  }
})

const toolState = computed(() => (props.block.meta?.toolState as string) || (props.block.streaming ? 'streaming' : 'finished'))

const stateLabel = computed(() => {
  switch (toolState.value) {
    case 'running': return '执行中'
    case 'finished': return '已完成'
    case 'error': return '错误'
    default: return '等待执行'
  }
})

const stateIcon = computed(() => {
  switch (toolState.value) {
    case 'running': return '🔄'
    case 'finished': return '✅'
    case 'error': return '❌'
    default: return '⏳'
  }
})

const stateClass = computed(() => {
  switch (toolState.value) {
    case 'running': return 'state-running'
    case 'finished': return 'state-finished'
    case 'error': return 'state-error'
    default: return 'state-pending'
  }
})

const tagType = computed(() => {
  switch (toolState.value) {
    case 'running': return 'warning'
    case 'finished': return 'success'
    case 'error': return 'danger'
    default: return 'info'
  }
})
</script>

<style scoped>
.tool-call-block {
  border: 1px solid var(--tool-border, #e3e8f0);
  border-radius: 8px;
  padding: 10px 14px;
  margin: 6px 0;
  background: var(--tool-bg, #f8fafc);
  transition: border-color 0.3s;
}
.tool-call-block.state-running {
  border-color: var(--tool-streaming-border, #f59e0b);
}
.tool-call-block.state-finished {
  border-color: var(--tool-success-border, #10b981);
}
.tool-call-block.state-error {
  border-color: var(--tool-error-border, #ef4444);
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
.tool-call-result {
  margin-top: 8px;
  background: var(--code-bg, #1e1e2e);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
}
.result-label {
  color: var(--text-secondary, #999);
  margin-bottom: 4px;
  font-size: 11px;
}
.result-json {
  margin: 0;
  color: var(--code-color, #e0e0e0);
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
  overflow-y: auto;
}
</style>
