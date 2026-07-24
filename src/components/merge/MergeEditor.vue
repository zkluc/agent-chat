<!-- src/components/merge/MergeEditor.vue -->
<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import * as monaco from 'monaco-editor'
import { editor as Editor } from 'monaco-editor'
import type { MergeResult, MergeChange, MergeConflict } from '@/utils/merge'
import { resolveConflict } from '@/utils/merge'

self.MonacoEnvironment = {
  getWorker() {
    const url = new URL('monaco-editor/esm/vs/editor/editor.worker', import.meta.url)
    return new Worker(url, { type: 'module' })
  },
}

const props = defineProps<{
  mergeResult: MergeResult
  baseLabel?: string
  compareLabel?: string
}>()

const emit = defineEmits<{
  (e: 'update:mergeResult', result: MergeResult): void
  (e: 'export', content: string): void
}>()

const mergeResult = computed(() => props.mergeResult)
const baseLabel = computed(() => props.baseLabel || 'Base')
const compareLabel = computed(() => props.compareLabel || 'Compare')

// Monaco editor instances
const leftEditorRef = ref<HTMLDivElement | null>(null)
const rightEditorRef = ref<HTMLDivElement | null>(null)
const resultEditorRef = ref<HTMLDivElement | null>(null)

let leftEditor: Editor.IStandaloneCodeEditor | null = null
let rightEditor: Editor.IStandaloneCodeEditor | null = null
let resultEditor: Editor.IStandaloneCodeEditor | null = null

const leftModel = monaco.editor.createModel('')
const rightModel = monaco.editor.createModel('')
const resultModel = monaco.editor.createModel('')

// Diff decoration IDs
const leftDecorations = ref<string[]>([])
const rightDecorations = ref<string[]>([])
const resultDecorations = ref<string[]>([])

// Active conflict selection
const activeConflict = ref<number | null>(null)

// Stats
const stats = computed(() => {
  const r = mergeResult.value
  return {
    totalChanges: r.changes.length,
    leftOnly: r.changes.filter(c => c.type === 'left-only').length,
    rightOnly: r.changes.filter(c => c.type === 'right-only').length,
    conflicts: r.conflicts.length,
    resolved: r.conflicts.filter(c => c.resolved).length,
  }
})

// Initialize editors
onMounted(() => {
  if (leftEditorRef.value) {
    leftEditor = monaco.editor.create(leftEditorRef.value, {
      model: leftModel,
      readOnly: true,
      minimap: { enabled: false },
      lineNumbers: 'on',
      renderLineHighlight: 'none',
      scrollbar: { vertical: 'hidden', horizontal: 'auto' },
      overviewRulerLanes: 0,
      folding: false,
      glyphMargin: false,
      lineDecorationsWidth: 8,
      lineNumbersMinChars: 3,
      theme: document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'vs-dark' : 'vs',
    })
  }

  if (rightEditorRef.value) {
    rightEditor = monaco.editor.create(rightEditorRef.value, {
      model: rightModel,
      readOnly: true,
      minimap: { enabled: false },
      lineNumbers: 'on',
      renderLineHighlight: 'none',
      scrollbar: { vertical: 'hidden', horizontal: 'auto' },
      overviewRulerLanes: 0,
      folding: false,
      glyphMargin: false,
      lineDecorationsWidth: 8,
      lineNumbersMinChars: 3,
      theme: document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'vs-dark' : 'vs',
    })
  }

  if (resultEditorRef.value) {
    resultEditor = monaco.editor.create(resultEditorRef.value, {
      model: resultModel,
      readOnly: false,
      minimap: { enabled: false },
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      scrollbar: { vertical: 'auto', horizontal: 'auto' },
      overviewRulerLanes: 0,
      folding: false,
      glyphMargin: false,
      lineDecorationsWidth: 8,
      lineNumbersMinChars: 3,
      theme: document.documentElement.getAttribute('data-theme') === 'dark'
        ? 'vs-dark' : 'vs',
    })
  }

  updateEditors()
})

onBeforeUnmount(() => {
  leftEditor?.dispose()
  rightEditor?.dispose()
  resultEditor?.dispose()
  leftModel.dispose()
  rightModel.dispose()
  resultModel.dispose()
})

// Watch for merge result changes
watch(mergeResult, () => {
  updateEditors()
}, { deep: true })

function updateEditors() {
  const r = mergeResult.value

  // Update left editor (base version)
  leftModel.setValue(r.baseText)

  // Update right editor (merged result)
  resultModel.setValue(r.mergedText)

  // Update middle editor (show conflicts/changes side)
  updateCompareEditor()

  // Apply decorations
  applyDecorations()
}

function updateCompareEditor() {
  const r = mergeResult.value
  const lines: string[] = []
  const baseLines = r.baseText.split('\n')

  let offset = 0
  const allRegions: Array<{
    start: number
    end: number
    lines: string[]
    type: string
  }> = []

  for (const change of r.changes) {
    allRegions.push({
      start: change.baseStart,
      end: change.baseEnd,
      lines: change.leftSelected ? change.leftContent : change.rightContent,
      type: change.type,
    })
  }

  for (const c of r.conflicts) {
    allRegions.push({
      start: c.baseStart,
      end: c.baseEnd,
      lines: c.selectedSide === 'left'
        ? c.leftContent
        : c.selectedSide === 'right'
          ? c.rightContent
          : [...c.leftContent, ...c.rightContent],
      type: 'conflict',
    })
  }

  allRegions.sort((a, b) => a.start - b.start)

  for (const region of allRegions) {
    while (offset < region.start && offset < baseLines.length) {
      lines.push(baseLines[offset])
      offset++
    }
    lines.push(...region.lines)
    offset = region.end
  }

  while (offset < baseLines.length) {
    lines.push(baseLines[offset])
    offset++
  }

  rightModel.setValue(lines.join('\n'))
}

function applyDecorations() {
  const r = mergeResult.value

  // Clear existing decorations
  leftEditor?.removeDecorations(leftDecorations.value)
  rightEditor?.removeDecorations(rightDecorations.value)
  resultEditor?.removeDecorations(resultDecorations.value)

  const leftDecs: monaco.editor.IModelDeltaDecoration[] = []
  const rightDecs: monaco.editor.IModelDeltaDecoration[] = []
  const resultDecs: monaco.editor.IModelDeltaDecoration[] = []

  // Highlight changes in base editor
  for (const change of r.changes) {
    const color = change.type === 'left-only'
      ? 'rgba(124, 58, 237, 0.15)'
      : 'rgba(236, 72, 153, 0.15)'

    leftDecs.push({
      range: new monaco.Range(
        change.baseStart + 1, 1,
        change.baseEnd, Number.MAX_SAFE_INTEGER
      ),
      options: {
        isWholeLine: true,
        className: `merge-change-${change.type}`,
        overviewRuler: {
          color: change.type === 'left-only'
            ? 'rgba(124, 58, 237, 0.5)'
            : 'rgba(236, 72, 153, 0.5)',
          position: monaco.editor.OverviewRulerLane.Full,
        },
      },
    })
  }

  // Highlight conflicts in base editor
  for (const conflict of r.conflicts) {
    leftDecs.push({
      range: new monaco.Range(
        conflict.baseStart + 1, 1,
        conflict.baseEnd, Number.MAX_SAFE_INTEGER
      ),
      options: {
        isWholeLine: true,
        className: 'merge-conflict',
        overviewRuler: {
          color: 'rgba(239, 68, 68, 0.5)',
          position: monaco.editor.OverviewRulerLane.Full,
        },
      },
    })
  }

  leftDecorations.value = leftEditor?.deltaDecorations(
    leftDecorations.value, leftDecs
  ) || []

  rightDecorations.value = rightEditor?.deltaDecorations(
    rightDecorations.value, rightDecs
  ) || []

  resultDecorations.value = resultEditor?.deltaDecorations(
    resultDecorations.value, resultDecs
  ) || []
}

function handleConflictSide(conflictId: number, side: 'left' | 'right') {
  const updated = resolveConflict(mergeResult.value, conflictId, side)
  emit('update:mergeResult', updated)
}

function handleAcceptAll() {
  const r = mergeResult.value
  for (const conflict of r.conflicts) {
    conflict.resolved = true
    conflict.selectedSide = 'left'
  }
  emit('update:mergeResult', { ...r })
}

function handleRejectAll() {
  const r = mergeResult.value
  for (const change of r.changes) {
    change.leftSelected = change.type === 'left-only'
  }
  for (const conflict of r.conflicts) {
    conflict.resolved = false
    conflict.selectedSide = 'left'
  }
  emit('update:mergeResult', { ...r })
}

function handleExport() {
  emit('export', mergeResult.value.mergedText)
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}
</script>

<template>
  <div class="merge-editor">
    <!-- Toolbar -->
    <div class="merge-toolbar">
      <div class="merge-toolbar-left">
        <el-tag size="small" effect="plain">
          {{ stats.totalChanges }} 处变更
        </el-tag>
        <el-tag v-if="stats.conflicts > 0" size="small" type="danger" effect="plain">
          {{ stats.resolved }}/{{ stats.conflicts }} 冲突已解决
        </el-tag>
        <el-tag v-else size="small" type="success" effect="plain">
          无冲突
        </el-tag>
      </div>
      <div class="merge-toolbar-right">
        <el-button size="small" @click="handleAcceptAll">
          全部接受
        </el-button>
        <el-button size="small" @click="handleRejectAll">
          全部拒绝
        </el-button>
        <el-button size="small" type="primary" @click="handleExport">
          导出合并结果
        </el-button>
      </div>
    </div>

    <!-- Editor Panels -->
    <div class="merge-panels">
      <!-- Base (Left) -->
      <div class="merge-panel">
        <div class="panel-header">
          <span class="panel-label">{{ baseLabel }}</span>
          <el-tag size="small" type="info">原始版本</el-tag>
        </div>
        <div ref="leftEditorRef" class="editor-container" />
      </div>

      <!-- Compare (Middle) -->
      <div class="merge-panel">
        <div class="panel-header">
          <span class="panel-label">{{ compareLabel }}</span>
          <el-tag size="small" type="warning">变更视图</el-tag>
        </div>
        <div ref="rightEditorRef" class="editor-container" />
      </div>

      <!-- Result (Right) -->
      <div class="merge-panel">
        <div class="panel-header">
          <span class="panel-label">合并结果</span>
          <el-tag size="small" type="success">可编辑</el-tag>
        </div>
        <div ref="resultEditorRef" class="editor-container" />
      </div>
    </div>

    <!-- Conflict Resolution Panel -->
    <div v-if="mergeResult.conflicts.length > 0" class="conflict-panel">
      <div class="conflict-header">
        <span>冲突解决</span>
      </div>
      <div class="conflict-list">
        <div
          v-for="conflict in mergeResult.conflicts"
          :key="conflict.id"
          class="conflict-item"
          :class="{ resolved: conflict.resolved }"
        >
          <div class="conflict-info">
            <span class="conflict-line">
              行 {{ conflict.baseStart + 1 }}-{{ conflict.baseEnd }}
            </span>
            <el-tag
              v-if="conflict.resolved"
              size="small"
              type="success"
            >
              已解决 ({{ conflict.selectedSide === 'left' ? '左侧' : '右侧' }})
            </el-tag>
            <el-tag v-else size="small" type="danger">
              待解决
            </el-tag>
          </div>
          <div class="conflict-preview">
            <div class="conflict-side">
              <span class="side-label">左侧:</span>
              <code>{{ conflict.leftContent.slice(0, 2).join('\n') }}</code>
            </div>
            <div class="conflict-side">
              <span class="side-label">右侧:</span>
              <code>{{ conflict.rightContent.slice(0, 2).join('\n') }}</code>
            </div>
          </div>
          <div class="conflict-actions">
            <el-button
              size="small"
              :type="conflict.selectedSide === 'left' ? 'primary' : ''"
              @click="handleConflictSide(conflict.id, 'left')"
            >
              保留左侧
            </el-button>
            <el-button
              size="small"
              :type="conflict.selectedSide === 'right' ? 'primary' : ''"
              @click="handleConflictSide(conflict.id, 'right')"
            >
              保留右侧
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.merge-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--doubao-bg-primary);
  color: var(--doubao-text-primary);
}

.merge-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--doubao-border-primary);
  background: var(--doubao-bg-card);
  flex-shrink: 0;
  gap: 8px;
}

.merge-toolbar-left,
.merge-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.merge-panels {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 1px;
  background: var(--doubao-border-primary);
}

.merge-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--doubao-bg-primary);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: var(--doubao-bg-card);
  border-bottom: 1px solid var(--doubao-border-primary);
  flex-shrink: 0;
}

.panel-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--doubao-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.editor-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Conflict Panel */
.conflict-panel {
  flex-shrink: 0;
  max-height: 300px;
  border-top: 2px solid var(--doubao-border-primary);
  background: var(--doubao-bg-base);
  display: flex;
  flex-direction: column;
}

.conflict-header {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--doubao-text-primary);
  border-bottom: 1px solid var(--doubao-border-primary);
  flex-shrink: 0;
}

.conflict-list {
  overflow-y: auto;
  flex: 1;
  padding: 8px;
}

.conflict-item {
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--doubao-border-secondary);
  border-radius: var(--doubao-radius-xs);
  background: var(--doubao-bg-primary);
  transition: all 0.2s;
}

.conflict-item:hover {
  border-color: var(--doubao-brand);
}

.conflict-item.resolved {
  border-color: var(--doubao-border-light);
  opacity: 0.7;
}

.conflict-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.conflict-line {
  font-size: 12px;
  font-weight: 600;
  color: var(--doubao-text-secondary);
  font-family: 'Cascadia Code', 'Fira Code', monospace;
}

.conflict-preview {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.conflict-side {
  flex: 1;
  padding: 6px 8px;
  background: var(--doubao-bg-base);
  border-radius: 4px;
  overflow: hidden;
}

.side-label {
  font-size: 10px;
  color: var(--doubao-text-tertiary);
  text-transform: uppercase;
  margin-bottom: 4px;
  display: block;
}

.conflict-side code {
  display: block;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--doubao-text-secondary);
  font-family: 'Cascadia Code', 'Fira Code', monospace;
}

.conflict-actions {
  display: flex;
  gap: 8px;
}

/* Monaco editor customization */
:deep(.monaco-editor) {
  border-radius: 0;
}

:deep(.monaco-editor .margin) {
  background: var(--doubao-bg-card) !important;
}
</style>
