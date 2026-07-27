<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useConversationStore } from '@/stores/conversation'
import { computeThreeWayMerge, type MergeResult } from '@/utils/merge'
import MergeEditor from '@/components/merge/MergeEditor.vue'
import { Operation, Document, Edit, Files, Position, Plus, Delete, CopyDocument } from '@element-plus/icons-vue'
import { Upload as UploadIcon } from '@element-plus/icons-vue'
import type { ContentBlock } from '@/events/types'

interface Version {
  id: string
  name: string
  content: string
  fileName?: string
}

const store = useConversationStore()

// Version management
const versions = ref<Version[]>([])
let versionIdCounter = 0

// Selection for merge
const selectedBase = ref<string | null>(null)
const selectedCompare = ref<string | null>(null)

// Merge result
const mergeResult = ref<MergeResult | null>(null)

// Import panel
const showImportPanel = ref(false)

// Drag state per version
const dragState = ref<Record<string, boolean>>({})

let nextId = 0
function genId(): string {
  return `v_${Date.now()}_${++nextId}`
}

// Computed labels for MergeEditor
const baseLabel = computed(() => {
  if (!selectedBase.value) return 'Base'
  return versions.value.find(v => v.id === selectedBase.value)?.name || 'Base'
})

const compareLabel = computed(() => {
  if (!selectedCompare.value) return 'Compare'
  return versions.value.find(v => v.id === selectedCompare.value)?.name || 'Compare'
})

// Merge stats from mergeResult
const mergeStats = computed(() => {
  if (!mergeResult.value) return null
  const r = mergeResult.value
  return {
    totalChanges: r.changes.length,
    conflicts: r.conflicts.length,
    resolved: r.conflicts.filter(c => c.resolved).length,
    hasConflicts: r.hasConflicts,
  }
})

// Version management functions
const VERSION_LIMIT = 3

function addVersion() {
  if (versions.value.length >= VERSION_LIMIT) return
  const id = genId()
  const num = versions.value.length + 1
  versions.value.push({ id, name: `版本 ${num}`, content: '' })
}

function removeVersion(id: string) {
  const idx = versions.value.findIndex(v => v.id === id)
  if (idx === -1) return
  versions.value.splice(idx, 1)
  if (selectedBase.value === id) selectedBase.value = null
  if (selectedCompare.value === id) selectedCompare.value = null
}

function renameVersion(id: string, newName: string) {
  const v = versions.value.find(v => v.id === id)
  if (v) v.name = newName
}

// File import
const fileInputRefs = ref<Record<string, HTMLInputElement>>({})

function setFileInputRef(el: HTMLInputElement | null, versionId: string) {
  if (el) fileInputRefs.value[versionId] = el
}

function triggerFileImport(versionId: string) {
  fileInputRefs.value[versionId]?.click()
}

function handleFileImport(event: Event, versionId: string) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) readFile(file, versionId)
}

function handleDrop(event: DragEvent, versionId: string) {
  event.preventDefault()
  dragState.value[versionId] = false
  const file = event.dataTransfer?.files?.[0]
  if (file) readFile(file, versionId)
}

function handleDragOver(event: DragEvent, versionId: string) {
  event.preventDefault()
  dragState.value[versionId] = true
}

function handleDragLeave(versionId: string) {
  dragState.value[versionId] = false
}

function readFile(file: File, versionId: string) {
  const reader = new FileReader()
  reader.onload = () => {
    const v = versions.value.find(v => v.id === versionId)
    if (v) {
      v.content = reader.result as string
      v.fileName = file.name
    }
  }
  reader.readAsText(file)
}

// Export
function handleExport(content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'merged-result.txt'
  a.click()
  URL.revokeObjectURL(url)
}

// Import from chat
function importFromChat(content: string) {
  const id = genId()
  const num = versions.value.length + 1
  versions.value.push({ id, name: `聊天导入 ${num}`, content })
  showImportPanel.value = false
}

// Merge computation
function computeMerge() {
  if (!selectedBase.value || !selectedCompare.value) {
    mergeResult.value = null
    return
  }
  const base = versions.value.find(v => v.id === selectedBase.value)
  const compare = versions.value.find(v => v.id === selectedCompare.value)
  if (!base || !compare) {
    mergeResult.value = null
    return
  }
  mergeResult.value = computeThreeWayMerge(base.content, base.content, compare.content)
}

watch([selectedBase, selectedCompare, versions], computeMerge, { deep: true })

// Merge editor handlers
function handleMergeResultUpdate(result: MergeResult) {
  mergeResult.value = result
}

// Chat import helpers
function extractBlockText(block: ContentBlock): string {
  const u = block as unknown as Record<string, unknown>
  switch (block.type) {
    case 'text': return (u.text as string) || ''
    case 'thinking': return (u.thinking as string) || ''
    case 'data': {
      const src = u.source
      if (src && typeof src === 'object') {
        const s = src as Record<string, unknown>
        if (s.type === 'url') return `[${s.url}]`
      }
      return '[data]'
    }
    default: return String(block.type)
  }
}

const availableMessages = computed(() => store.messages)
</script>

<template>
  <div class="file-compare">
    <!-- Left Sidebar: Version List -->
    <div class="version-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">版本管理</span>
        <el-button :icon="Plus" size="small" type="primary" link :disabled="versions.length >= VERSION_LIMIT" @click="addVersion">
          添加版本 {{ versions.length >= VERSION_LIMIT ? '(最多3个)' : '' }}
        </el-button>
      </div>
      <div class="version-list">
        <div
          v-for="v in versions"
          :key="v.id"
          class="version-item"
          :class="{
            'is-base': selectedBase === v.id,
            'is-compare': selectedCompare === v.id,
          }"
        >
          <div
            class="version-item-main"
            :class="{ 'drag-over': dragState[v.id] }"
            @drop.prevent="handleDrop($event, v.id)"
            @dragover="handleDragOver($event, v.id)"
            @dragleave="handleDragLeave(v.id)"
          >
            <div class="version-name-row">
              <input
                class="version-name-input"
                :value="v.name"
                @change="renameVersion(v.id, ($event.target as HTMLInputElement).value)"
                @blur="renameVersion(v.id, ($event.target as HTMLInputElement).value)"
                @keydown.enter="($event.target as HTMLInputElement).blur()"
              />
              <el-button
                :icon="Delete"
                size="small"
                type="danger"
                link
                class="version-delete-btn"
                @click="removeVersion(v.id)"
              />
            </div>
            <div class="version-info">
              <span v-if="v.fileName" class="version-file-name">{{ v.fileName }}</span>
              <span v-else class="version-empty">未导入</span>
            </div>
            <div class="version-actions">
              <input
                :ref="(el) => setFileInputRef(el as HTMLInputElement, v.id)"
                type="file"
                style="display:none"
                accept=".txt,.ts,.js,.jsx,.tsx,.vue,.html,.css,.json,.md,.py,.go,.java,.yaml,.yml,.xml,.sh,.sql,.c,.cpp,.h,.cs,.rb,.rs,.swift,.kt,.dart,.php,.log,.cfg,.ini,.env,.csv,.docx,.pdf,.doc"
                @change="handleFileImport($event, v.id)"
              />
              <el-button size="small" :icon="UploadIcon" link @click="triggerFileImport(v.id)">导入文件</el-button>
              <el-button
                size="small"
                :type="selectedBase === v.id ? 'success' : ''"
                link
                @click="selectedBase = selectedBase === v.id ? null : v.id"
              >
                {{ selectedBase === v.id ? '✓ 基准' : '设为基准' }}
              </el-button>
              <el-button
                size="small"
                :type="selectedCompare === v.id ? 'warning' : ''"
                link
                @click="selectedCompare = selectedCompare === v.id ? null : v.id"
              >
                {{ selectedCompare === v.id ? '✓ 对比' : '设为对比' }}
              </el-button>
            </div>
          </div>
        </div>
        <div v-if="versions.length === 0" class="version-empty-state">
          <p>暂无版本</p>
          <span>点击"添加版本"开始</span>
        </div>
      </div>

      <!-- Chat Import -->
      <div class="sidebar-section">
        <el-button :icon="Files" size="small" link @click="showImportPanel = !showImportPanel">
          从聊天记录导入
        </el-button>
      </div>
    </div>

    <!-- Main Area -->
    <div class="main-area">
      <!-- Top Toolbar -->
      <div class="compare-toolbar">
        <div class="toolbar-left">
          <span class="toolbar-label">基准:</span>
          <el-tag v-if="baseLabel !== 'Base'" size="small" type="success" effect="dark">{{ baseLabel }}</el-tag>
          <span v-else class="toolbar-hint">未选择</span>
          <span class="toolbar-separator">→</span>
          <span class="toolbar-label">对比:</span>
          <el-tag v-if="compareLabel !== 'Compare'" size="small" type="warning" effect="dark">{{ compareLabel }}</el-tag>
          <span v-else class="toolbar-hint">未选择</span>
        </div>
        <div class="toolbar-right">
          <span v-if="mergeStats" class="merge-stats">
            <el-tag size="small" effect="plain">{{ mergeStats.totalChanges }} 处变更</el-tag>
            <el-tag v-if="mergeStats.hasConflicts" size="small" type="danger" effect="plain">
              {{ mergeStats.resolved }}/{{ mergeStats.conflicts }} 冲突已解决
            </el-tag>
            <el-tag v-else size="small" type="success" effect="plain">无冲突</el-tag>
          </span>
        </div>
      </div>

      <!-- Merge Editor or Empty State -->
      <div v-if="mergeResult" class="merge-editor-wrapper">
        <MergeEditor
          :merge-result="mergeResult"
          :base-label="baseLabel"
          :compare-label="compareLabel"
          @update:merge-result="handleMergeResultUpdate"
          @export="handleExport"
        />
      </div>
      <div v-else class="empty-state">
        <Edit :size="48" class="empty-icon" />
        <p>文件合并对比</p>
        <span class="empty-desc">
          在左侧添加版本并导入文件，然后选择基准和对比版本以查看合并差异
        </span>
      </div>
    </div>

    <!-- Chat Import Panel (overlay) -->
    <div v-if="showImportPanel" class="import-overlay" @click.self="showImportPanel = false">
      <div class="import-panel">
        <div class="import-header">
          <h4>从聊天记录选择内容</h4>
          <el-button text size="small" @click="showImportPanel = false">关闭</el-button>
        </div>
        <div class="import-list">
          <div
            v-for="msg in availableMessages"
            :key="msg.id"
            class="import-item"
          >
            <div class="import-item-header">
              <el-tag :type="msg.role === 'user' ? 'info' : 'success'" size="small">
                {{ msg.role === 'user' ? '用户' : 'AI' }}
              </el-tag>
              <span class="import-item-time">{{ msg.created_at }}</span>
            </div>
            <div class="import-item-content">
              <div
                v-for="(block, bi) in msg.content"
                :key="bi"
                class="import-block"
              >
                <span v-if="block.type === 'text'" class="block-label">文本</span>
                <span class="block-preview">{{ extractBlockText(block).slice(0, 80) }}...</span>
                <div class="block-actions">
                  <el-button size="small" link :icon="CopyDocument" @click="importFromChat(extractBlockText(block))">
                    导入为新版本
                  </el-button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="store.messages.length === 0" class="import-empty">暂无聊天记录</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-compare {
  display: flex;
  height: 100vh;
  background: var(--doubao-bg-primary);
  color: var(--doubao-text-primary);
  overflow: hidden;
}

/* Left Sidebar */
.version-sidebar {
  width: 250px;
  min-width: 250px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--doubao-border-primary);
  background: var(--doubao-bg-card);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid var(--doubao-border-primary);
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--doubao-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.version-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.version-item {
  border-bottom: 1px solid var(--doubao-border-light);
}

.version-item-main {
  padding: 8px 12px;
  transition: background 0.15s;
}

.version-item-main:hover {
  background: var(--doubao-bg-base);
}

.version-item-main.drag-over {
  outline: 2px dashed var(--doubao-brand);
  outline-offset: -2px;
  background: rgba(100, 120, 255, 0.03);
}

.version-item.is-base .version-item-main {
  border-left: 3px solid var(--doubao-brand);
}

.version-item.is-compare .version-item-main {
  border-left: 3px solid #e6a23c;
}

.version-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.version-name-input {
  flex: 1;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--doubao-text-primary);
  outline: none;
  min-width: 0;
}

.version-name-input:hover {
  border-color: var(--doubao-border-primary);
}

.version-name-input:focus {
  border-color: var(--doubao-brand);
  background: var(--doubao-bg-base);
}

.version-delete-btn {
  opacity: 0;
  transition: opacity 0.15s;
}

.version-item:hover .version-delete-btn {
  opacity: 1;
}

.version-info {
  margin-top: 2px;
}

.version-file-name {
  font-size: 11px;
  color: var(--doubao-brand);
}

.version-empty {
  font-size: 11px;
  color: var(--doubao-text-placeholder);
}

.version-actions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.version-import-btn {
  cursor: pointer;
}

.version-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  color: var(--doubao-text-placeholder);
}

.version-empty-state p {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--doubao-text-secondary);
}

.version-empty-state span {
  margin-top: 4px;
  font-size: 12px;
}

.sidebar-section {
  padding: 8px 12px;
  border-top: 1px solid var(--doubao-border-primary);
  flex-shrink: 0;
}

/* Main Area */
.main-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

/* Toolbar */
.compare-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--doubao-border-primary);
  background: var(--doubao-bg-card);
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-label {
  font-size: 12px;
  color: var(--doubao-text-secondary);
  font-weight: 600;
}

.toolbar-hint {
  font-size: 12px;
  color: var(--doubao-text-placeholder);
}

.toolbar-separator {
  margin: 0 4px;
  color: var(--doubao-text-placeholder);
  font-size: 14px;
}

.merge-stats {
  display: flex;
  gap: 4px;
}

/* Merge Editor Wrapper */
.merge-editor-wrapper {
  flex: 1;
  min-height: 0;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--doubao-text-placeholder);
  user-select: none;
}

.empty-icon {
  color: var(--doubao-text-quaternary);
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--doubao-text-secondary);
}

.empty-desc {
  margin-top: 8px;
  font-size: 13px;
  color: var(--doubao-text-placeholder);
  text-align: center;
  max-width: 400px;
}

/* Import Overlay */
.import-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.import-panel {
  width: 600px;
  max-height: 80vh;
  background: var(--doubao-bg-card);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.import-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--doubao-border-primary);
  flex-shrink: 0;
}

.import-header h4 {
  margin: 0;
  font-size: 14px;
  color: var(--doubao-text-primary);
}

.import-list {
  padding: 8px 0;
  overflow-y: auto;
  flex: 1;
}

.import-item {
  padding: 8px 16px;
  border-bottom: 1px solid var(--doubao-border-light);
}

.import-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.import-item-time {
  font-size: 12px;
  color: var(--doubao-text-placeholder);
}

.import-item-content {
  margin-top: 6px;
}

.import-block {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  font-size: 13px;
}

.block-label {
  font-size: 11px;
  color: var(--doubao-text-secondary);
  white-space: nowrap;
}

.block-preview {
  flex: 1;
  color: var(--doubao-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.block-actions {
  display: flex;
  gap: 4px;
}

.import-empty {
  padding: 20px;
  text-align: center;
  color: var(--doubao-text-placeholder);
  font-size: 13px;
}
</style>
