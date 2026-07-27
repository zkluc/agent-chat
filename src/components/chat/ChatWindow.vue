<template>
  <div class="chat-layout">
    <ConversationSidebar
      v-model="sidebarVisible"
      :desktop-visible="sidebarOpen"
      :conversations="conversations"
      :active-id="activeConversationId"
      @new="handleNewConversation"
      @select="handleSelectConversation"
      @delete="handleDeleteConversation"
    />

    <div class="chat-main">
      <div class="chat-header">
        <el-button class="sidebar-toggle" :icon="Fold" text @click="toggleSidebar" />
        <div class="header-info">
          <h3 class="chat-title">{{ conversationTitle }}</h3>
          <el-tag v-if="status !== 'idle'" size="small" :type="statusTagType">
            {{ statusLabel }}
          </el-tag>
        </div>
        <div class="header-actions">
          <el-button class="settings-toggle" :icon="Setting" text @click="toggleSettings" />
          <el-button class="compare-toggle" :icon="Operation" text @click="goToFileCompare" title="文件对比" />
        </div>
      </div>

      <div class="chat-body">
        <MessageList
          :messages="messages"
          :is-streaming="isStreaming"
          @retry="handleRetry"
          @regenerate="handleRegenerate"
        />
      </div>

      <ChatInput
        :is-streaming="isStreaming"
        :more-visible="moreMenuVisible"
        @send="handleSend"
        @toggle-more="moreMenuVisible = !moreMenuVisible"
      />
    </div>

    <SettingsPanel v-model="settingsVisible" :desktop-visible="settingsOpen" />

    <FloatingMenu
      :visible="moreMenuVisible"
      @close="moreMenuVisible = false"
      @action="handleMenuAction"
    />

    <HumanConfirmDialog
      v-model="confirmVisible"
      :tool-calls="pendingToolCalls"
      @confirm="handleConfirm"
      @deny="handleDeny"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Fold, Setting, Operation } from '@element-plus/icons-vue'
import { useConversationStore } from '@/stores/conversation'
import { useStreamProtocol } from '@/composables/useStreamProtocol'
import type { ToolCallBlock } from '@/events/types'
import MessageList from './MessageList.vue'
import ChatInput from './ChatInput.vue'
import ConversationSidebar from './ConversationSidebar.vue'
import HumanConfirmDialog from './HumanConfirmDialog.vue'
import SettingsPanel from './SettingsPanel.vue'
import FloatingMenu from './FloatingMenu.vue'

const store = useConversationStore()
const router = useRouter()
const { status, sendMessage, connect, disconnect } = useStreamProtocol()

const sidebarVisible = ref(false)
const sidebarOpen = ref(true)
const settingsVisible = ref(false)
const settingsOpen = ref(true)
const confirmVisible = ref(false)
const moreMenuVisible = ref(false)
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

function toggleSidebar() {
  if (window.innerWidth <= 767) {
    sidebarVisible.value = true
  } else {
    sidebarOpen.value = !sidebarOpen.value
  }
}

function toggleSettings() {
  if (window.innerWidth <= 767) {
    settingsVisible.value = true
  } else {
    settingsOpen.value = !settingsOpen.value
  }
}

function handleMenuAction(key: string) {
  moreMenuVisible.value = false
  switch (key) {
    case 'settings':
      toggleSettings()
      break
    case 'clear':
      store.clearMessages()
      break
    case 'export':
      break
    case 'new-window':
      break
    case 'about':
      break
  }
}

function handleClear() {
  store.clearMessages()
}

function handleConfirm(results: { tool_call_id: string; allowed: boolean }[]) {
  console.log('Tool confirmation results:', results)
}

function handleDeny() {
  console.log('Tool call denied')
}

function handleRetry(text: string) {
  handleSend(text)
}

function handleRegenerate(id: string) {
  const msgs = store.messages
  const msgIndex = msgs.findIndex(m => m.id === id)
  if (msgIndex < 1) return
  for (let i = msgIndex - 1; i >= 0; i--) {
    if (msgs[i].role === 'user') {
      const text = msgs[i].content
        .filter(b => b.type === 'text')
        .map(b => (b as { type: 'text'; text: string }).text)
        .join('\n')
      if (text) {
        handleSend(text)
      }
      return
    }
  }
}

function goToFileCompare() {
  router.push('/compare')
}

if (!store.activeConversationId) {
  store.createConversation()
}
</script>

<style scoped>
.chat-layout {
  display: flex;
  height: 100vh;
  max-height: 100vh;
  background: var(--doubao-bg-primary);
  font-family: var(--doubao-font-family);
}
.chat-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 400px;
  background: var(--doubao-bg-primary);
}
@media (max-width: 799px) {
  .chat-main {
    min-width: 0;
  }
}
.chat-header {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 10px 16px;
  border-bottom: 1px solid var(--doubao-border-primary);
  background: var(--doubao-bg-primary);
  flex-shrink: 0;
  height: 52px;
}
.sidebar-toggle,
.settings-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--doubao-text-secondary);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  font-size: 16px;
}
.sidebar-toggle:hover,
.settings-toggle:hover,
.compare-toggle:hover {
  background: var(--doubao-bg-base);
  color: var(--doubao-brand);
}
.sidebar-toggle {
  margin-right: 4px;
}
.header-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.chat-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--doubao-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.header-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 2px;
}
.chat-body {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  background: var(--doubao-bg-primary);
}
</style>
