<template>
  <div class="thinking-block">
    <div class="thinking-header" @click="expanded = !expanded">
      <span class="thinking-icon">💭</span>
      <span class="thinking-label">思考过程</span>
      <span class="thinking-toggle">{{ expanded ? '收起' : '展开' }}</span>
    </div>
    <Transition name="collapse">
      <div v-if="expanded" class="thinking-content">
        <div class="thinking-text">{{ block.content }}</div>
        <StreamingCursor v-if="block.streaming" />
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import StreamingCursor from '@/components/common/StreamingCursor.vue'

const props = defineProps<{
  block: {
    id: string
    type: string
    content: string
    streaming: boolean
    complete: boolean
  }
}>()

const expanded = ref(false)
</script>

<style scoped>
.thinking-block {
  border: 1px solid var(--thinking-border, #e8d5f5);
  border-radius: 8px;
  margin: 6px 0;
  overflow: hidden;
}
.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  background: var(--thinking-bg, #faf5ff);
  user-select: none;
}
.thinking-icon { font-size: 14px; }
.thinking-label {
  font-size: 13px;
  color: var(--thinking-color, #7c3aed);
  font-weight: 500;
  flex: 1;
}
.thinking-toggle {
  font-size: 12px;
  color: var(--text-secondary, #999);
}
.thinking-content {
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary, #666);
  max-height: 300px;
  overflow-y: auto;
}
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
