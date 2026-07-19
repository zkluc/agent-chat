<template>
  <el-drawer v-model="visible" title="对话历史" direction="ltr" size="280px">
    <div class="sidebar-content">
      <el-button type="primary" class="new-chat-btn" @click="handleNew">
        <el-icon><Plus /></el-icon> 新建对话
      </el-button>
      <div class="conversation-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: conv.id === activeId }"
          @click="handleSelect(conv.id)"
        >
          <div class="conv-title">{{ conv.title }}</div>
          <div class="conv-meta">
            {{ conv.messages.length }} 条消息 · {{ formatRelativeTime(conv.updated_at) }}
          </div>
          <el-button
            class="conv-delete"
            type="danger"
            :icon="Delete"
            size="small"
            circle
            plain
            @click.stop="handleDelete(conv.id)"
          />
        </div>
        <div v-if="conversations.length === 0" class="empty">
          暂无对话
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import type { Conversation } from '@/events/types'
import { formatRelativeTime } from '@/utils'

const props = defineProps<{
  modelValue: boolean
  conversations: Conversation[]
  activeId: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'new': []
  'select': [id: string]
  'delete': [id: string]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

function handleNew() {
  emit('new')
  visible.value = false
}

function handleSelect(id: string) {
  emit('select', id)
  visible.value = false
}

function handleDelete(id: string) {
  emit('delete', id)
}
</script>

<style scoped>
.sidebar-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.new-chat-btn {
  margin-bottom: 16px;
}
.conversation-list {
  flex: 1;
  overflow-y: auto;
}
.conversation-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  margin-bottom: 4px;
}
.conversation-item:hover {
  background: var(--hover-bg, #f5f5f5);
}
.conversation-item.active {
  background: var(--active-bg, #ecf5ff);
}
.conv-title {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 24px;
}
.conv-meta {
  font-size: 12px;
  color: var(--text-secondary, #999);
  margin-top: 2px;
}
.conv-delete {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0;
  transition: opacity 0.15s;
}
.conversation-item:hover .conv-delete {
  opacity: 1;
}
.empty {
  text-align: center;
  color: var(--text-secondary, #999);
  padding: 40px 0;
}
</style>
