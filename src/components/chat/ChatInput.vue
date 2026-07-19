<template>
  <div class="chat-input">
    <div class="input-wrapper">
      <el-input
        ref="inputRef"
        v-model="inputText"
        type="textarea"
        :autosize="{ minRows: 1, maxRows: 6 }"
        placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
        :disabled="isStreaming"
        @keydown="handleKeydown"
        resize="none"
      />
      <div class="input-actions">
        <span class="char-count" v-if="inputText.length > 0">{{ inputText.length }}</span>
        <el-button
          type="primary"
          :icon="Promotion"
          :disabled="!canSend"
          circle
          @click="handleSend"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Promotion } from '@element-plus/icons-vue'

const props = defineProps<{
  isStreaming: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
}>()

const inputText = ref('')
const inputRef = ref()

const canSend = computed(() => {
  return inputText.value.trim().length > 0 && !props.isStreaming
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleSend() {
  const text = inputText.value.trim()
  if (!text || props.isStreaming) return
  emit('send', text)
  inputText.value = ''
  nextTick(() => {
    inputRef.value?.focus()
  })
}
</script>

<style scoped>
.chat-input {
  padding: 12px 16px;
  border-top: 1px solid var(--border-color, #e0e0e0);
  background: var(--input-bg, #fff);
}
.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--input-inner-bg, #f5f5f5);
  border-radius: 12px;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #e0e0e0);
  transition: border-color 0.2s;
}
.input-wrapper:focus-within {
  border-color: var(--primary-color, #409eff);
}
.input-wrapper :deep(.el-textarea__inner) {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0;
  font-size: 14px;
  line-height: 1.5;
}
.input-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-bottom: 2px;
}
.char-count {
  font-size: 11px;
  color: var(--text-secondary, #999);
}
</style>
