<template>
  <div class="tool-result-block" :class="stateClass">
    <div class="tool-result-header">
      <span class="result-icon">{{ stateIcon }}</span>
      <span class="tool-name">{{ block.meta?.name || '工具结果' }}</span>
      <el-tag size="small" :type="tagType">{{ stateLabel }}</el-tag>
      <el-button
        v-if="block.content"
        size="small"
        text
        class="copy-btn"
        @click="copyResult"
      >
        {{ copied ? '已复制' : '复制' }}
      </el-button>
    </div>
    <div class="tool-result-output">
      <pre class="output-text">{{ formattedOutput }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

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

const copied = ref(false)

const resultState = computed(() => (props.block.meta?.resultState as string) || 'running')

const formattedOutput = computed(() => {
  const output = (props.block.meta?.output as string) || props.block.content
  if (!output) return ''
  try {
    return JSON.stringify(JSON.parse(output), null, 2)
  } catch {
    return output
  }
})

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

async function copyResult() {
  try {
    await navigator.clipboard.writeText(formattedOutput.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = formattedOutput.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  }
}
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
.copy-btn {
  margin-left: auto;
  font-size: 12px;
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
