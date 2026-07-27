<!-- src/components/merge/MergeEditor.vue — Beyond Compare style two-panel diff -->
<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import * as monaco from 'monaco-editor'
import { editor as Editor } from 'monaco-editor'
import type { MergeResult, MergeChange, MergeConflict } from '@/utils/merge'
import { resolveConflict } from '@/utils/merge'

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

// Two-panel editors
const leftEditorRef = ref<HTMLDivElement | null>(null)
const rightEditorRef = ref<HTMLDivElement | null>(null)
let leftEditor: Editor.IStandaloneCodeEditor | null = null
let rightEditor: Editor.IStandaloneCodeEditor | null = null
const leftModel = monaco.editor.createModel('')
const rightModel = monaco.editor.createModel('')
const leftDecorations = ref<string[]>([])
const rightDecorations = ref<string[]>([])

// Sync scroll state
let syncingScroll = false

// Conflict resolution
const expandedConflicts = ref<Set<number>>(new Set())

function isConflictExpanded(index: number): boolean {
  return expandedConflicts.value.has(index)
}

function toggleConflict(index: number) {
  if (expandedConflicts.value.has(index)) {
    expandedConflicts.value.delete(index)
  } else {
    expandedConflicts.value.add(index)
  }
}

function syncExpandedConflicts() {
  const r = mergeResult.value
  const newExpanded = new Set<number>()
  for (let i = 0; i < r.conflicts.length; i++) {
    if (!r.conflicts[i].resolved) {
      newExpanded.add(i)
    } else if (expandedConflicts.value.has(i)) {
      newExpanded.add(i)
    }
  }
  expandedConflicts.value = newExpanded
}

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
  const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'vs-dark' : 'vs'
  const baseOpts: Editor.IStandaloneEditorConstructionOptions = {
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
    theme,
  }

  if (leftEditorRef.value) {
    leftEditor = monaco.editor.create(leftEditorRef.value, {
      ...baseOpts,
      model: leftModel,
    })
  }

  if (rightEditorRef.value) {
    rightEditor = monaco.editor.create(rightEditorRef.value, {
      ...baseOpts,
      model: rightModel,
    })
  }

  // Sync scroll between panels
  leftEditor?.onDidScrollChange((e) => {
    if (syncingScroll) return
    syncingScroll = true
    rightEditor?.setScrollPosition({ scrollTop: e.scrollTop })
    syncingScroll = false
  })

  rightEditor?.onDidScrollChange((e) => {
    if (syncingScroll) return
    syncingScroll = true
    leftEditor?.setScrollPosition({ scrollTop: e.scrollTop })
    syncingScroll = false
  })

  updateEditors()
})

onBeforeUnmount(() => {
  leftEditor?.dispose()
  rightEditor?.dispose()
  leftModel.dispose()
  rightModel.dispose()
})

watch(mergeResult, () => {
  updateEditors()
}, { deep: true })

function updateEditors() {
  const r = mergeResult.value

  // Left panel = base file (original)
  leftModel.setValue(r.baseText)

  // Right panel = compare file (original)
  rightModel.setValue(r.compareText)

  applyDecorations()
  syncExpandedConflicts()
}

function applyDecorations() {
  const r = mergeResult.value

  leftEditor?.removeDecorations(leftDecorations.value)
  rightEditor?.removeDecorations(rightDecorations.value)

  const leftDecs: monaco.editor.IModelDeltaDecoration[] = []
  const rightDecs: monaco.editor.IModelDeltaDecoration[] = []

  // Highlight non-conflict changes
  for (const change of r.changes) {
    const startLine = change.baseStart + 1
    const endLine = change.baseEnd

    if (change.type === 'left-only') {
      // Deleted in compare — highlight red on left panel
      leftDecs.push({
        range: new monaco.Range(startLine, 1, endLine, Number.MAX_SAFE_INTEGER),
        options: {
          isWholeLine: true,
          linesDecorationsWidth: 6,
          inlineClassName: 'diff-deleted',
          overviewRuler: { color: 'rgba(239,68,68,0.5)', position: monaco.editor.OverviewRulerLane.Full },
        },
      })
    } else {
      // Added in compare — highlight green on right panel
      rightDecs.push({
        range: new monaco.Range(startLine, 1, endLine, Number.MAX_SAFE_INTEGER),
        options: {
          isWholeLine: true,
          linesDecorationsWidth: 6,
          inlineClassName: 'diff-added',
          overviewRuler: { color: 'rgba(34,197,94,0.5)', position: monaco.editor.OverviewRulerLane.Full },
        },
      })
    }
  }

  // Highlight conflict regions
  for (const conflict of r.conflicts) {
    const startLine = conflict.baseStart + 1
    const endLine = conflict.baseEnd

    if (conflict.resolved) {
      // Resolved conflict — show which side was chosen
      const cls = conflict.selectedSide === 'left' ? 'diff-resolved-left' : 'diff-resolved-right'
      leftDecs.push({
        range: new monaco.Range(startLine, 1, endLine, Number.MAX_SAFE_INTEGER),
        options: { isWholeLine: true, linesDecorationsWidth: 6, inlineClassName: cls },
      })
      rightDecs.push({
        range: new monaco.Range(startLine, 1, endLine, Number.MAX_SAFE_INTEGER),
        options: { isWholeLine: true, linesDecorationsWidth: 6, inlineClassName: cls },
      })
    } else {
      // Unresolved conflict — red highlight on both panels
      leftDecs.push({
        range: new monaco.Range(startLine, 1, endLine, Number.MAX_SAFE_INTEGER),
        options: {
          isWholeLine: true,
          linesDecorationsWidth: 6,
          inlineClassName: 'diff-conflict',
          overviewRuler: { color: 'rgba(239,68,68,0.6)', position: monaco.editor.OverviewRulerLane.Full },
        },
      })
      rightDecs.push({
        range: new monaco.Range(startLine, 1, endLine, Number.MAX_SAFE_INTEGER),
        options: {
          isWholeLine: true,
          linesDecorationsWidth: 6,
          inlineClassName: 'diff-conflict',
          overviewRuler: { color: 'rgba(239,68,68,0.6)', position: monaco.editor.OverviewRulerLane.Full },
        },
      })
    }
  }

  leftDecorations.value = leftEditor?.deltaDecorations(leftDecorations.value, leftDecs) || []
  rightDecorations.value = rightEditor?.deltaDecorations(rightDecorations.value, rightDecs) || []
}

function handleConflictSide(index: number, side: 'left' | 'right' | 'both') {
  const conflict = mergeResult.value.conflicts[index]
  const updated = resolveConflict(mergeResult.value, conflict.id, side)
  emit('update:mergeResult', updated)
  expandedConflicts.value.delete(index)
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
  for (const conflict of r.conflicts) {
    conflict.resolved = false
    conflict.selectedSide = 'left'
  }
  emit('update:mergeResult', { ...r })
}

function handleExport() {
  emit('export', mergeResult.value.mergedText)
}
</script>

<template>
  <div class="bc-editor">
    <!-- Toolbar -->
    <div class="bc-toolbar">
      <div class="bc-toolbar-left">
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
      <div class="bc-toolbar-right">
        <el-button size="small" @click="handleAcceptAll">全部接受</el-button>
        <el-button size="small" @click="handleRejectAll">全部拒绝</el-button>
        <el-button size="small" type="primary" @click="handleExport">导出合并结果</el-button>
      </div>
    </div>

    <!-- Two-panel diff view -->
    <div class="bc-panels">
      <!-- Left: Base file -->
      <div class="bc-panel">
        <div class="bc-panel-header bc-panel-header--left">
          <span class="bc-panel-label">{{ baseLabel }}</span>
        </div>
        <div ref="leftEditorRef" class="bc-editor-container" />
      </div>

      <!-- Center gutter -->
      <div class="bc-gutter">
        <div class="bc-gutter-line" />
      </div>

      <!-- Right: Compare file -->
      <div class="bc-panel">
        <div class="bc-panel-header bc-panel-header--right">
          <span class="bc-panel-label">{{ compareLabel }}</span>
        </div>
        <div ref="rightEditorRef" class="bc-editor-container" />
      </div>
    </div>

    <!-- Inline conflict resolution blocks -->
    <div v-if="mergeResult.conflicts.length > 0" class="bc-conflicts">
      <div
        v-for="(conflict, idx) in mergeResult.conflicts"
        :key="conflict.id"
        class="bc-conflict"
        :class="{
          'bc-conflict--resolved': conflict.resolved,
          'bc-conflict--unresolved': !conflict.resolved,
        }"
      >
        <!-- Conflict header -->
        <div class="bc-conflict-header" @click="toggleConflict(idx)">
          <div class="bc-conflict-header-left">
            <span class="bc-conflict-expand">{{ isConflictExpanded(idx) ? '▾' : '▸' }}</span>
            <span class="bc-conflict-id">冲突 #{{ idx + 1 }}</span>
            <span class="bc-conflict-range">行 {{ conflict.baseStart + 1 }}-{{ conflict.baseEnd }}</span>
          </div>
          <div class="bc-conflict-header-right">
            <el-tag v-if="conflict.resolved" size="small" type="success" effect="dark">
              ✓ {{ conflict.selectedSide === 'left' ? '已选' + baseLabel : conflict.selectedSide === 'right' ? '已选' + compareLabel : '双方保留' }}
            </el-tag>
            <el-tag v-else size="small" type="danger" effect="dark">待解决</el-tag>
          </div>
        </div>

        <!-- Conflict body: side-by-side content -->
        <div v-if="isConflictExpanded(idx)" class="bc-conflict-body">
          <div class="bc-conflict-sides">
            <!-- Left side -->
            <div class="bc-conflict-side bc-conflict-side--left" :class="{ 'bc-conflict-side--selected': conflict.selectedSide === 'left' }">
              <div class="bc-conflict-side-head">
                <span class="bc-conflict-side-label">{{ baseLabel }}</span>
                <el-button size="small" :type="conflict.selectedSide === 'left' ? 'success' : 'default'" @click.stop="handleConflictSide(idx, 'left')">
                  {{ conflict.selectedSide === 'left' ? '✓ 已选' : '接受此版本' }}
                </el-button>
              </div>
              <div class="bc-conflict-side-code">
                <pre v-for="(line, li) in conflict.leftContent" :key="li">{{ line || ' ' }}</pre>
                <div v-if="conflict.leftContent.length === 0" class="bc-conflict-empty">(空)</div>
              </div>
            </div>

            <!-- Divider -->
            <div class="bc-conflict-divider" />

            <!-- Right side -->
            <div class="bc-conflict-side bc-conflict-side--right" :class="{ 'bc-conflict-side--selected': conflict.selectedSide === 'right' }">
              <div class="bc-conflict-side-head">
                <span class="bc-conflict-side-label">{{ compareLabel }}</span>
                <el-button size="small" :type="conflict.selectedSide === 'right' ? 'success' : 'default'" @click.stop="handleConflictSide(idx, 'right')">
                  {{ conflict.selectedSide === 'right' ? '✓ 已选' : '接受此版本' }}
                </el-button>
              </div>
              <div class="bc-conflict-side-code">
                <pre v-for="(line, li) in conflict.rightContent" :key="li">{{ line || ' ' }}</pre>
                <div v-if="conflict.rightContent.length === 0" class="bc-conflict-empty">(空)</div>
              </div>
            </div>
          </div>

          <!-- Both button -->
          <div class="bc-conflict-both">
            <el-button size="small" :type="conflict.selectedSide === 'both' ? 'warning' : 'default'" @click.stop="handleConflictSide(idx, 'both')">
              双方都保留
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Merged result preview -->
    <div v-if="mergeResult.conflicts.length > 0" class="bc-merged-preview">
      <div class="bc-merged-preview-header">
        <span class="bc-merged-preview-title">合并结果预览</span>
      </div>
      <pre class="bc-merged-preview-code">{{ mergeResult.mergedText }}</pre>
    </div>
  </div>
</template>

<style scoped>
.bc-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--doubao-bg-primary);
  color: var(--doubao-text-primary);
}

/* Toolbar */
.bc-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--doubao-border-primary);
  background: var(--doubao-bg-card);
  flex-shrink: 0;
  gap: 8px;
}

.bc-toolbar-left,
.bc-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Two-panel layout */
.bc-panels {
  display: flex;
  flex: 1;
  min-height: 0;
}

.bc-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.bc-panel-header {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background: var(--doubao-bg-card);
  border-bottom: 1px solid var(--doubao-border-primary);
  flex-shrink: 0;
}

.bc-panel-header--left {
  border-right: 1px solid var(--doubao-border-primary);
}

.bc-panel-header--right {
  border-left: 1px solid var(--doubao-border-primary);
}

.bc-panel-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--doubao-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.bc-editor-container {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* Center gutter */
.bc-gutter {
  width: 3px;
  background: var(--doubao-border-primary);
  flex-shrink: 0;
}

.bc-gutter-line {
  width: 100%;
  height: 100%;
}

/* Conflict blocks */
.bc-conflicts {
  flex-shrink: 0;
  max-height: 350px;
  border-top: 2px solid var(--doubao-border-primary);
  background: var(--doubao-bg-base);
  overflow-y: auto;
}

.bc-conflict {
  margin: 8px;
  border: 1px solid var(--doubao-border-secondary);
  border-radius: 6px;
  background: var(--doubao-bg-primary);
  overflow: hidden;
}

.bc-conflict--unresolved {
  border-color: var(--doubao-danger, #f56c6c);
  border-left: 3px solid var(--doubao-danger, #f56c6c);
}

.bc-conflict--resolved {
  border-color: var(--doubao-success, #67c23a);
  border-left: 3px solid var(--doubao-success, #67c23a);
  opacity: 0.7;
}

.bc-conflict--resolved:hover {
  opacity: 1;
}

.bc-conflict-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}

.bc-conflict-header:hover {
  background: var(--doubao-bg-hover, rgba(255,255,255,0.03));
}

.bc-conflict-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bc-conflict-expand {
  color: var(--doubao-text-secondary);
  font-size: 12px;
  width: 12px;
}

.bc-conflict-id {
  font-size: 13px;
  font-weight: 600;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
}

.bc-conflict-range {
  font-size: 12px;
  color: var(--doubao-text-placeholder);
}

.bc-conflict-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bc-conflict-body {
  border-top: 1px solid var(--doubao-border-light);
}

.bc-conflict-sides {
  display: flex;
}

.bc-conflict-side {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.bc-conflict-side--left {
  background: rgba(124, 58, 237, 0.03);
}

.bc-conflict-side--left.bc-conflict-side--selected {
  background: rgba(124, 58, 237, 0.10);
}

.bc-conflict-side--right {
  background: rgba(236, 72, 153, 0.03);
}

.bc-conflict-side--right.bc-conflict-side--selected {
  background: rgba(236, 72, 153, 0.10);
}

.bc-conflict-divider {
  width: 1px;
  background: var(--doubao-border-primary);
}

.bc-conflict-side-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 10px;
  border-bottom: 1px solid var(--doubao-border-light);
}

.bc-conflict-side-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--doubao-text-secondary);
  text-transform: uppercase;
}

.bc-conflict-side-code {
  padding: 6px 10px;
  overflow-x: auto;
}

.bc-conflict-side-code pre {
  margin: 0;
  padding: 1px 0;
  font-size: 12px;
  line-height: 1.5;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

.bc-conflict-empty {
  font-size: 12px;
  color: var(--doubao-text-placeholder);
  font-style: italic;
}

.bc-conflict-both {
  padding: 6px 10px;
  border-top: 1px solid var(--doubao-border-light);
  display: flex;
  justify-content: center;
  background: var(--doubao-bg-card);
}

/* Monaco customization */
:deep(.monaco-editor) {
  border-radius: 0;
}

:deep(.monaco-editor .margin) {
  background: var(--doubao-bg-card) !important;
}

/* Line-level diff highlighting — Beyond Compare style */
:deep(.diff-deleted) {
  background: rgba(239, 68, 68, 0.12) !important;
}

:deep(.diff-added) {
  background: rgba(34, 197, 94, 0.12) !important;
}

:deep(.diff-conflict) {
  background: rgba(239, 68, 68, 0.15) !important;
}

:deep(.diff-resolved-left) {
  background: rgba(124, 58, 237, 0.10) !important;
}

:deep(.diff-resolved-right) {
  background: rgba(236, 72, 153, 0.10) !important;
}

/* Merged result preview */
.bc-merged-preview {
  flex-shrink: 0;
  max-height: 200px;
  border-top: 1px solid var(--doubao-border-primary);
  background: var(--doubao-bg-base);
  display: flex;
  flex-direction: column;
}

.bc-merged-preview-header {
  padding: 6px 12px;
  border-bottom: 1px solid var(--doubao-border-light);
  flex-shrink: 0;
}

.bc-merged-preview-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--doubao-text-secondary);
  text-transform: uppercase;
}

.bc-merged-preview-code {
  margin: 0;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.5;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  color: var(--doubao-text-primary);
  overflow: auto;
  flex: 1;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
