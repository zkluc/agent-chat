<template>
  <div class="tool-result-block" :class="stateClass">
    <div class="tool-result-header">
      <span class="result-icon">{{ stateIcon }}</span>
      <span class="tool-name">{{ block.meta?.name || '工具结果' }}</span>
      <el-tag size="small" :type="tagType">{{ stateLabel }}</el-tag>
    </div>
    <div class="tool-result-output">
      <pre class="output-text">{{ block.content }}</pre>
    </div>
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

const resultState = computed(() => (props.block.meta?.resultState as string) || 'running')

const stateIcon = computed(() => {
  switch (resultState.value) {
    case 'success': return '✅'
    case 'error': return '❌'
    case 'interrupted': return '⏹️'
    case 'denied': return '🚫'
    default: return '⏳'
  }
})

const stateLabel = computed(() => {
  switch (resultState.value) {
    case 'success': return '成功'
    case 'error': return '错误'
    case 'interrupted': return '已中断'
    case 'denied': return '已拒绝'
    default: return '执行中'
  }
})

const stateClass = computed(() => `state-${resultState.value}`)
const tagType = computed(() => {
  switch (resultState.value) {
    case 'success': return 'success'
    case 'error': return 'danger'
    default: return 'info'
  }
})
</script>

<style scoped>
.tool-result-block {
  border: 1px solid var(--result-border, #e0e7ff);
  border-radius: 8px;
  padding: 10px 14px;
  margin: 6px 0;
  background: var(--result-bg, #f0f4ff);
}
.tool-result-block.state-success {
  border-color: var(--success-border, #bbf7d0);
  background: var(--success-bg, #f0fdf4);
}
.tool-result-block.state-error {
  border-color: var(--error-border, #fecaca);
  background: var(--error-bg, #fef2f2);
}
.tool-result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.result-icon { font-size: 14px; }
.tool-name {
  font-weight: 600;
  font-size: 13px;
}
.tool-result-output {
  background: var(--code-bg, #1e1e2e);
  border-radius: 6px;
  padding: 8px 12px;
}
.output-text {
  margin: 0;
  color: var(--code-color, #e0e0e0);
  font-family: 'Consolas', 'Monaco', monospace;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  max-height: 200px;
  overflow-y: auto;
}
</style>
