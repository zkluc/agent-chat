<template>
  <el-dialog
    v-model="visible"
    title="确认执行"
    width="480px"
    :close-on-click-modal="false"
  >
    <div class="confirm-content">
      <div class="confirm-icon">⚠️</div>
      <div class="confirm-title">Agent 请求执行以下操作</div>
      <div class="confirm-tools">
        <div
          v-for="tool in toolCalls"
          :key="tool.id"
          class="confirm-tool"
        >
          <div class="tool-name">🔧 {{ tool.name }}</div>
          <pre class="tool-input">{{ tool.input }}</pre>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="handleDeny">拒绝</el-button>
      <el-button type="primary" @click="handleConfirm">确认执行</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ToolCallBlock } from '@/events/types'

const props = defineProps<{
  modelValue: boolean
  toolCalls: ToolCallBlock[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [results: { tool_call_id: string; allowed: boolean }[]]
  'deny': []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function handleConfirm() {
  const results = props.toolCalls.map(tc => ({ tool_call_id: tc.id, allowed: true }))
  emit('confirm', results)
  visible.value = false
}

function handleDeny() {
  emit('deny')
  visible.value = false
}
</script>

<style scoped>
.confirm-content { text-align: center; }
.confirm-icon { font-size: 36px; margin-bottom: 8px; }
.confirm-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}
.confirm-tools { text-align: left; }
.confirm-tool {
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 8px;
}
.tool-name { font-weight: 600; font-size: 13px; margin-bottom: 6px; }
.tool-input {
  font-size: 12px;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
