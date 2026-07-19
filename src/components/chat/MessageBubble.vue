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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Message, ContentBlock } from '@/events/types'
import BlockRenderer from '@/components/blocks/BlockRenderer.vue'
import StreamingCursor from '@/components/common/StreamingCursor.vue'
import { formatTime } from '@/utils'

const props = defineProps<{
  message: Message
  streaming?: boolean
}>()

const avatarColor = computed(() => {
  return props.message.role === 'user' ? '#409eff' : '#67c23a'
})

const avatarText = computed(() => {
  return props.message.role === 'user' ? 'U' : 'A'
})

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
  padding: 12px 16px;
  transition: background 0.2s;
}
.message-bubble:hover {
  background: var(--message-hover-bg, rgba(0,0,0,0.02));
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
  background: var(--user-msg-bg, #ecf5ff);
  border-radius: 12px 2px 12px 12px;
}
.message-bubble.assistant .message-content {
  background: var(--assistant-msg-bg, #f4f4f5);
  border-radius: 2px 12px 12px 12px;
}
.avatar { flex-shrink: 0; }
.message-body {
  max-width: 75%;
  min-width: 60px;
}
.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.sender-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #333);
}
.message-time {
  font-size: 11px;
  color: var(--text-secondary, #999);
}
.message-content {
  padding: 10px 14px;
  word-break: break-word;
  line-height: 1.6;
}
.empty-streaming {
  display: inline;
}
</style>
