<template>
  <div class="chat-input">
    <div class="input-container">
      <!-- 输入框区域 -->
      <div class="input-main">
        <div class="input-wrapper">
          <el-input
            ref="inputRef"
            v-model="inputText"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 6 }"
            placeholder="输入消息..."
            :disabled="isStreaming"
            @keydown="handleKeydown"
            resize="none"
          />
        </div>
      </div>

      <!-- 底部工具栏 -->
      <div class="input-toolbar">
        <div class="toolbar-left">
          <button class="toolbar-btn add-btn" @click="$emit('add')" title="添加附件">
            <el-icon :size="18"><Plus /></el-icon>
          </button>
        </div>

        <div class="toolbar-center">
          <div class="quick-tags">
            <span
              v-for="tag in quickTags"
              :key="tag"
              class="quick-tag"
              @click="handleTagClick(tag)"
            >{{ tag }}</span>
          </div>
        </div>

        <div class="toolbar-right">
          <button
            class="toolbar-btn more-btn"
            :class="{ active: moreVisible }"
            @click="$emit('toggle-more')"
            title="更多"
          >
            <el-icon :size="18"><MoreFilled /></el-icon>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Plus, MoreFilled } from '@element-plus/icons-vue'

const props = defineProps<{
  isStreaming: boolean
  moreVisible?: boolean
}>()

const emit = defineEmits<{
  send: [text: string]
  add: []
  'toggle-more': []
}>()

const inputText = ref('')
const inputRef = ref()

const quickTags = [
  '快速',
  '视频生成',
  '帮我写作',
  '图像生成',
  '音乐生成',
  '翻译',
  '深入研究',
]

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

function handleTagClick(tag: string) {
  inputText.value = tag + ' '
  nextTick(() => {
    inputRef.value?.focus()
  })
}
</script>

<style scoped>
.chat-input {
  padding: 0 16px 16px;
  background: var(--doubao-bg-primary);
}

.input-container {
  background: var(--doubao-bg-float);
  border-radius: var(--doubao-radius-l);
  border: 1px solid var(--doubao-border-secondary);
  transition: border-color 0.2s, box-shadow 0.2s;
  overflow: hidden;
}
.input-container:focus-within {
  border-color: var(--doubao-brand);
  box-shadow: 0px 0px 0px 2px var(--doubao-brand-bg);
}

/* 输入框 */
.input-main {
  padding: 12px 16px 4px;
}
.input-wrapper :deep(.el-textarea__inner) {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  padding: 0;
  font-size: 16px;
  line-height: 24px;
  color: var(--doubao-text-secondary);
  caret-color: var(--doubao-brand);
}
.input-wrapper :deep(.el-textarea__inner)::placeholder {
  color: var(--doubao-text-quaternary);
}

/* 底部工具栏 */
.input-toolbar {
  display: flex;
  align-items: center;
  padding: 6px 8px 8px;
  gap: 4px;
}

.toolbar-left,
.toolbar-right {
  flex-shrink: 0;
}

.toolbar-center {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.toolbar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--doubao-text-tertiary);
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  padding: 0;
}
.toolbar-btn:hover {
  background: var(--doubao-bg-base);
  color: var(--doubao-brand);
}
.toolbar-btn.active {
  background: var(--doubao-brand);
  color: #fff;
}

/* 快捷标签 */
.quick-tags {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 0 4px;
}
.quick-tags::-webkit-scrollbar {
  display: none;
}

.quick-tag {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: 20px;
  background: var(--doubao-bg-base);
  color: var(--doubao-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
  user-select: none;
}
.quick-tag:hover {
  background: var(--doubao-border-tertiary);
  color: var(--doubao-text-primary);
}
</style>
