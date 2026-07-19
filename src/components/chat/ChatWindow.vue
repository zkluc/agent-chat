<template>
  <div class="chat-window">
    <div class="chat-header">
      <el-button :icon="Fold" text @click="sidebarVisible = true" />
      <div class="header-info">
        <h3 class="chat-title">{{ conversationTitle }}</h3>
        <el-tag v-if="status !== 'idle'" size="small" :type="statusTagType">
          {{ statusLabel }}
        </el-tag>
      </div>
      <div class="header-actions">
        <el-dropdown trigger="click">
          <el-button :icon="MoreFilled" text />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleSettings">设置</el-dropdown-item>
              <el-dropdown-item @click="handleClear">清空对话</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="chat-body">
      <MessageList
        :messages="messages"
        :is-streaming="isStreaming"
      />
    </div>

    <ChatInput
      :is-streaming="isStreaming"
      @send="handleSend"
    />

    <ConversationSidebar
      v-model="sidebarVisible"
      :conversations="conversations"
      :active-id="activeConversationId"
      @new="handleNewConversation"
      @select="handleSelectConversation"
      @delete="handleDeleteConversation"
    />

    <HumanConfirmDialog
      v-model="confirmVisible"
      :tool-calls="pendingToolCalls"
      @confirm="handleConfirm"
      @deny="handleDeny"
    />

    <el-drawer v-model="settingsVisible" title="设置" direction="rtl" size="360px">
      <SettingsPanel />
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Fold, MoreFilled } from '@element-plus/icons-vue'
import { useConversationStore } from '@/stores/conversation'
import { useStreamProtocol } from '@/composables/useStreamProtocol'
import type { ToolCallBlock } from '@/events/types'
import MessageList from './MessageList.vue'
import ChatInput from './ChatInput.vue'
import ConversationSidebar from './ConversationSidebar.vue'
import HumanConfirmDialog from './HumanConfirmDialog.vue'
import SettingsPanel from './SettingsPanel.vue'

const store = useConversationStore()
const { status, sendMessage, connect, disconnect } = useStreamProtocol()

const sidebarVisible = ref(false)
const settingsVisible = ref(false)
const confirmVisible = ref(false)
const pendingToolCalls = ref<ToolCallBlock[]>([])

const messages = computed(() => store.messages)
const isStreaming = computed(() => store.isStreaming)
const conversations = computed(() => store.conversations)
const activeConversationId = computed(() => store.activeConversationId)
const conversationTitle = computed(() => store.activeConversation?.title || '新对话')

const statusLabel = computed(() => {
  switch (status.value) {
    case 'connecting': return '连接中...'
    case 'connected': return '已连接'
    case 'streaming': return '回复中...'
    case 'disconnected': return '已断开'
    case 'error': return '连接错误'
    default: return ''
  }
})

const statusTagType = computed(() => {
  switch (status.value) {
    case 'streaming': return 'warning'
    case 'connected': return 'success'
    case 'error': return 'danger'
    default: return 'info'
  }
})

function handleSend(text: string) {
  if (!store.activeConversationId) {
    store.createConversation()
  }
  sendMessage(text)
}

function handleNewConversation() {
  store.createConversation()
}

function handleSelectConversation(id: string) {
  store.setActiveConversation(id)
}

function handleDeleteConversation(id: string) {
  store.deleteConversation(id)
}

function handleSettings() {
  settingsVisible.value = true
}

function handleClear() {
  store.clearMessages()
}

function handleConfirm(results: { tool_call_id: string; allowed: boolean }[]) {
  // Send confirmation results back through protocol
  console.log('Tool confirmation results:', results)
}

function handleDeny() {
  console.log('Tool call denied')
}

// Create initial conversation
if (!store.activeConversationId) {
  store.createConversation()
}
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  background: var(--chat-bg, #fff);
}
.chat-header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  background: var(--header-bg, #fff);
  flex-shrink: 0;
  gap: 12px;
}
.header-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.chat-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.header-actions {
  flex-shrink: 0;
}
.chat-body {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}
</style>
