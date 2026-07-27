<template>
  <!-- 桌面端固定侧边栏 -->
  <div class="sidebar-desktop" :class="{ hidden: !desktopVisible }">
    <!-- 顶部搜索框 -->
    <div class="sidebar-top">
      <div class="search-box" @click="searchFocused = true">
        <el-icon class="search-icon"><Search /></el-icon>
        <span class="search-placeholder">搜索... <kbd>Ctrl+K</kbd></span>
      </div>
    </div>

    <!-- 会话操作按钮 -->
    <div class="sidebar-actions">
      <el-button class="action-btn" @click="handleNew">
        <el-icon><Plus /></el-icon> 新对话
      </el-button>
      <el-button class="action-btn" @click="handleNewOffice">
        <el-icon><Briefcase /></el-icon> 新办公任务
      </el-button>
    </div>

    <!-- 历史对话列表 -->
    <div class="sidebar-content">
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

    <!-- 底部用户信息栏 -->
    <div class="sidebar-footer">
      <div class="user-info">
        <el-avatar :size="32" class="user-avatar">U</el-avatar>
        <span class="user-name">用户</span>
      </div>
      <el-button size="small" type="primary" class="update-btn">完成更新</el-button>
    </div>
  </div>

  <!-- 移动端抽屉 -->
  <el-drawer v-model="drawerVisible" direction="ltr" size="280px">
    <template #header>
      <span class="drawer-title">对话历史</span>
    </template>
    <div class="sidebar-content">
      <div class="sidebar-actions">
        <el-button class="action-btn" @click="handleNewDrawer">
          <el-icon><Plus /></el-icon> 新对话
        </el-button>
        <el-button class="action-btn" @click="handleNewOffice">
          <el-icon><Briefcase /></el-icon> 新办公任务
        </el-button>
      </div>
      <div class="conversation-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: conv.id === activeId }"
          @click="handleSelectDrawer(conv.id)"
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
    <template #footer>
      <div class="sidebar-footer">
        <div class="user-info">
          <el-avatar :size="32" class="user-avatar">U</el-avatar>
          <span class="user-name">用户</span>
        </div>
        <el-button size="small" type="primary" class="update-btn">完成更新</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, Delete, Search, Briefcase } from '@element-plus/icons-vue'
import type { Conversation } from '@/events/types'
import { formatRelativeTime } from '@/utils'

const props = defineProps<{
  conversations: Conversation[]
  activeId: string | null
  modelValue?: boolean
  desktopVisible?: boolean
}>()

const emit = defineEmits<{
  'new': []
  'select': [id: string]
  'delete': [id: string]
  'update:modelValue': [value: boolean]
}>()

const drawerVisible = computed({
  get: () => props.modelValue ?? false,
  set: (v) => emit('update:modelValue', v),
})

const searchFocused = ref(false)

function handleNew() {
  emit('new')
}
function handleNewDrawer() {
  emit('new')
  drawerVisible.value = false
}
function handleNewOffice() {
  emit('new')
}
function handleSelect(id: string) {
  emit('select', id)
}
function handleSelectDrawer(id: string) {
  emit('select', id)
  drawerVisible.value = false
}
function handleDelete(id: string) {
  emit('delete', id)
}
</script>

<style scoped>
.sidebar-desktop {
  width: 280px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--doubao-border-primary);
  background: var(--doubao-bg-secondary);
  height: 100vh;
  overflow: hidden;
  transition: width 0.2s, min-width 0.2s, opacity 0.2s;
}
.sidebar-desktop.hidden {
  width: 0;
  min-width: 0;
  border-right: none;
  opacity: 0;
  overflow: hidden;
}
@media (max-width: 767px) {
  .sidebar-desktop {
    display: none;
  }
}

/* 顶部搜索框 */
.sidebar-top {
  padding: 16px 12px 8px;
  flex-shrink: 0;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--doubao-radius-xs);
  background: var(--doubao-bg-input);
  border: 1px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search-box:hover {
  border-color: var(--doubao-border-primary);
}
.search-icon {
  color: var(--doubao-text-tertiary);
  font-size: 16px;
  flex-shrink: 0;
}
.search-placeholder {
  font-size: 14px;
  color: var(--doubao-text-tertiary);
  flex: 1;
}
.search-placeholder kbd {
  font-size: 11px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--doubao-bg-primary);
  border: 1px solid var(--doubao-border-primary);
  color: var(--doubao-text-tertiary);
  font-family: inherit;
}

/* 操作按钮 */
.sidebar-actions {
  display: flex;
  gap: 8px;
  padding: 8px 12px 12px;
  flex-shrink: 0;
}
.action-btn {
  flex: 1;
  border-radius: var(--doubao-radius-xs) !important;
  font-weight: 500;
  font-size: 13px;
  height: 36px;
  border: 1px solid var(--doubao-border-secondary) !important;
  background: var(--doubao-bg-primary) !important;
  color: var(--doubao-text-primary) !important;
}
.action-btn:hover {
  background: var(--doubao-bg-base) !important;
  border-color: var(--doubao-border-primary) !important;
}

/* 对话列表 */
.sidebar-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}
.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
}
.conversation-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;
  margin-bottom: 2px;
}
.conversation-item:hover {
  background: var(--doubao-bg-base);
}
.conversation-item.active {
  background: var(--active-bg);
}
.conv-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--doubao-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 24px;
}
.conv-meta {
  font-size: 12px;
  color: var(--doubao-text-quaternary);
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
.conv-delete .el-icon {
  color: var(--doubao-text-tertiary);
}
.conv-delete:hover .el-icon {
  color: var(--doubao-brand);
}
.conversation-item:hover .conv-delete {
  opacity: 1;
}
.empty {
  text-align: center;
  color: var(--doubao-text-quaternary);
  padding: 40px 0;
  font-size: 14px;
}

/* 底部用户信息 */
.sidebar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid var(--doubao-border-primary);
  flex-shrink: 0;
  background: var(--doubao-bg-secondary);
}
.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-avatar {
  background: var(--doubao-brand) !important;
  color: #fff !important;
  font-size: 13px !important;
  font-weight: 600;
}
.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--doubao-text-primary);
}
.update-btn {
  border-radius: var(--doubao-radius-xs) !important;
  font-weight: 500;
  font-size: 13px;
}

.drawer-title {
  font-size: 16px;
  font-weight: 600;
}
</style>
