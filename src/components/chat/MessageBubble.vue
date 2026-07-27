<template>
  <div class="message-bubble" :class="[message.role, { streaming }]">
    <div class="avatar">
      <el-avatar :size="36" :style="{ background: avatarColor }">
        {{ avatarText }}
      </el-avatar>
    </div>
    <div class="message-body">
      <div class="message-header">
        <span class="sender-name">{{ message.name }}</span>
        <span class="message-time">{{ formatTime(message.created_at) }}</span>
      </div>
      <div class="message-content">
        <BlockRenderer
          v-for="block in message.content"
          :key="block.id"
          :block="convertBlock(block)"
        />
        <div v-if="message.content.length === 0 && streaming" class="empty-streaming">
          <StreamingCursor />
        </div>
      </div>

      <!-- AI 消息下方快捷推荐问句 -->
      <div
        v-if="message.role === 'assistant' && !streaming && message.content.length > 0"
        class="quick-recommend"
      >
        <span
          v-for="(q, i) in quickQuestions"
          :key="i"
          class="recommend-btn"
          @click="$emit('retry', q)"
        >{{ q }}</span>
      </div>

      <div v-if="!streaming" class="message-actions">
        <el-button text size="small" :icon="CopyDocument" @click="handleCopy" />
        <el-button v-if="message.role === 'assistant'" text size="small" :icon="Star" @click="toggleFavorite" />
        <el-button v-if="message.role === 'assistant'" text size="small" :icon="StarFilled" @click="handleLike" />
        <el-button v-if="message.role === 'assistant'" text size="small" :icon="Refresh" @click="handleRegenerate" />
        <el-button v-if="message.role === 'user'" text size="small" :icon="Refresh" @click="handleRetry" />
        <el-button text size="small" :icon="Delete" @click="handleDelete" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CopyDocument, Star, StarFilled, Refresh, Delete } from '@element-plus/icons-vue'
import type { Message, ContentBlock } from '@/events/types'
import { useConversationStore } from '@/stores/conversation'
import BlockRenderer from '@/components/blocks/BlockRenderer.vue'
import StreamingCursor from '@/components/common/StreamingCursor.vue'
import { formatTime } from '@/utils'

const props = defineProps<{
  message: Message
  streaming?: boolean
}>()

const emit = defineEmits<{
  retry: [text: string]
  regenerate: [id: string]
}>()

const store = useConversationStore()

const avatarColor = computed(() => {
  return props.message.role === 'user' ? 'var(--doubao-brand)' : 'var(--doubao-accent)'
})

const avatarText = computed(() => {
  return props.message.role === 'user' ? 'U' : 'A'
})

const quickQuestions = computed(() => {
  if (props.message.role !== 'assistant') return []
  const text = props.message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
  if (!text) return []
  return [
    '帮我详细展开这一段',
    '有没有其他写法',
    '帮我优化这段内容',
  ]
})

function getPlainText(): string {
  return props.message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('\n')
}

function handleCopy() {
  const text = getPlainText()
  navigator.clipboard.writeText(text)
}

function handleDelete() {
  store.deleteMessage(props.message.id)
}

function handleRetry() {
  emit('retry', getPlainText())
}

function handleRegenerate() {
  emit('regenerate', props.message.id)
}

function handleLike() {
}

function toggleFavorite() {
}

function convertBlock(block: ContentBlock): {
  id: string
  type: string
  content: string
  streaming: boolean
  complete: boolean
  meta?: Record<string, unknown>
} {
  switch (block.type) {
    case 'genui':
      return { id: block.id, type: 'genui', content: '', streaming: block.streaming, complete: !block.streaming, meta: { schema: block.schema, message: block.message } }
    case 'text':
      return { id: block.id, type: 'text', content: block.text, streaming: props.streaming || false, complete: !props.streaming }
    case 'thinking':
      return { id: block.id, type: 'thinking', content: block.thinking, streaming: props.streaming || false, complete: !props.streaming }
    case 'tool_call':
      return { id: block.id, type: 'tool_call', content: block.input, streaming: props.streaming || false, complete: block.state === 'finished', meta: { name: block.name, input: block.input } }
    case 'tool_result':
      return { id: block.id, type: 'tool_result', content: typeof block.output === 'string' ? block.output : '', streaming: props.streaming || false, complete: block.state !== 'running', meta: { name: block.name, resultState: block.state } }
    case 'data':
      return { id: block.id, type: 'data', content: block.source.type === 'url' ? block.source.url : block.source.data, streaming: props.streaming || false, complete: true, meta: { media_type: block.source.type === 'url' ? block.source.media_type : block.source.media_type, name: block.name } }
    case 'hint':
      return { id: block.id, type: 'hint', content: typeof block.hint === 'string' ? block.hint : '', streaming: false, complete: true, meta: { hint: block.hint, source: block.source } }
    default:
      return { id: block.id, type: 'unknown', content: '', streaming: false, complete: true }
  }
}
</script>

<style scoped>
.message-bubble {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  transition: background 0.15s;
  position: relative;
}
.message-bubble:hover {
  background: var(--doubao-bg-secondary);
}
.message-bubble.user {
  flex-direction: row-reverse;
}
.message-bubble.user .message-body {
  align-items: flex-end;
}
.message-bubble.user .message-header {
  flex-direction: row-reverse;
}
.message-bubble.user .message-content {
  background: var(--user-msg-bg);
  border-radius: var(--doubao-radius-s) 2px var(--doubao-radius-s) var(--doubao-radius-s);
}
.message-bubble.assistant .message-content {
  background: var(--assistant-msg-bg);
  border-radius: 2px var(--doubao-radius-s) var(--doubao-radius-s) var(--doubao-radius-s);
}
.avatar {
  flex-shrink: 0;
}
.avatar :deep(.el-avatar) {
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}
.message-body {
  max-width: 75%;
  min-width: 60px;
}
.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.sender-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--doubao-text-primary);
}
.message-time {
  font-size: 12px;
  color: var(--doubao-text-quaternary);
}
.message-content {
  padding: 12px 16px;
  word-break: break-word;
  line-height: 1.6;
  font-size: 16px;
  color: var(--doubao-text-secondary);
}
.empty-streaming {
  display: inline;
}

/* 快捷推荐问句 */
.quick-recommend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.recommend-btn {
  display: inline-block;
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
.recommend-btn:hover {
  background: var(--doubao-border-tertiary);
  color: var(--doubao-text-primary);
}

.message-actions {
  display: flex;
  gap: 2px;
  margin-top: 8px;
  padding: 0 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.message-actions :deep(.el-button) {
  color: var(--doubao-text-tertiary);
}
.message-actions :deep(.el-button:hover) {
  color: var(--doubao-brand);
}
.message-bubble:hover .message-actions {
  opacity: 1;
}
</style>
