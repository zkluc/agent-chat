# Monaco Merge Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a complete multi-version file comparison and merge solution using `node-diff3` for three-way merge logic and `monaco-editor-vue3` for visual diff display with line-level accept/reject controls.

**Architecture:** A new `src/utils/merge.ts` handles three-way merge computation via `node-diff3`. A new `src/components/merge/MergeEditor.vue` component provides a three-pane Monaco DiffEditor (Base | Compare | Result) with per-hunk accept/reject buttons. The existing `FileCompare.vue` is rewritten to integrate multi-version management, version selection, and the merge editor.

**Tech Stack:** `node-diff3` (three-way diff/merge), `monaco-editor` + `monaco-editor-vue3` (visual diff display), Vue 3 `<script setup>`, Element Plus UI components, existing `doubao-*` CSS variable system.

## Global Constraints

- Vue 3.5 + TypeScript strict mode
- Element Plus 2.14 as sole UI library
- `doubao-*` CSS variables for all theming (from `src/style.css`)
- No new CSS frameworks or preprocessors
- Monaco editor loaded via `monaco-editor` (CDN or bundled)
- `node-diff3` used as primary merge engine (not custom LCS)
- All components use `<script setup lang="ts">`
- Hash-based routing (`createWebHashHistory`)

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`
- Create: `node_modules/` (via pnpm install)

**Interfaces:** None (setup task).

- [ ] **Step 1: Install node-diff3 and monaco-editor**

```bash
cd D:\AI\agent-chat
pnpm add node-diff3 monaco-editor monaco-editor-vue3
```

- [ ] **Step 2: Install node-diff3 type definitions**

```bash
pnpm add -D @types/node-diff3
```

- [ ] **Step 3: Verify installation**

```bash
pnpm list node-diff3 monaco-editor monaco-editor-vue3
```

Expected: All three packages listed with version numbers.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: add node-diff3, monaco-editor, monaco-editor-vue3"
```

---

## Task 2: Create Merge Utility (`src/utils/merge.ts`)

**Files:**
- Create: `src/utils/merge.ts`

**Interfaces:**
- Consumes: `node-diff3` library
- Produces: `MergeResult`, `MergeChange`, `MergeConflict` types + `computeThreeWayMerge()` function (used by MergeEditor.vue in Task 3)

- [ ] **Step 1: Define merge types and implement computeThreeWayMerge**

```typescript
// src/utils/merge.ts
import { diff3_merge, type MergeRegion } from 'node-diff3'

export interface MergeChange {
  id: number
  type: 'common' | 'left-only' | 'right-only'
  baseStart: number
  baseEnd: number
  leftContent: string[]
  rightContent: string[]
  leftSelected: boolean
}

export interface MergeConflict {
  id: number
  baseStart: number
  baseEnd: number
  leftContent: string[]
  rightContent: string[]
  selectedSide: 'left' | 'right' | 'both'
  resolved: boolean
}

export interface MergeResult {
  baseText: string
  mergedText: string
  changes: MergeChange[]
  conflicts: MergeConflict[]
  totalLines: number
  hasConflicts: boolean
}

let changeIdCounter = 0

function makeChangeId(): number {
  return ++changeIdCounter
}

function makeConflictId(): number {
  return ++changeIdCounter
}

export function computeThreeWayMerge(
  baseText: string,
  leftText: string,
  rightText: string
): MergeResult {
  const baseLines = baseText.split('\n')
  const leftLines = leftText.split('\n')
  const rightLines = rightText.split('\n')

  const regions: MergeRegion[] = diff3_merge(leftLines, rightLines, baseLines)

  const changes: MergeChange[] = []
  const conflicts: MergeConflict[] = []
  const mergedLines: string[] = []

  let baseOffset = 0

  for (const region of regions) {
    const ok = region.ok
    const conflict = region.conflict

    if (ok) {
      // Non-conflicting change from one side
      const content = ok as string[]
      const regionSize = content.length
      const baseStart = baseOffset
      const baseEnd = baseOffset + regionSize

      // Determine if this came from left or right by comparing with base
      const baseSlice = baseLines.slice(baseStart, baseEnd).join('\n')
      const contentStr = content.join('\n')

      if (baseSlice === contentStr) {
        // No change from base — this is a context region
        mergedLines.push(...content)
        baseOffset = baseEnd
        continue
      }

      // Determine which side changed
      const leftSlice = leftLines.slice(
        Math.max(0, baseStart),
        Math.min(leftLines.length, baseEnd)
      ).join('\n')

      const side: 'left-only' | 'right-only' =
        leftSlice === contentStr ? 'left-only' : 'right-only'

      changes.push({
        id: makeChangeId(),
        type: side,
        baseStart,
        baseEnd,
        leftContent: side === 'left-only' ? content : [],
        rightContent: side === 'right-only' ? content : [],
        leftSelected: side === 'left-only',
      })

      mergedLines.push(...content)
      baseOffset = baseEnd
    } else if (conflict) {
      // Conflicting changes from both sides
      const leftPart = conflict.a as string[]
      const rightPart = conflict.b as string[]
      const regionSize = Math.max(leftPart.length, rightPart.length)
      const baseStart = baseOffset
      const baseEnd = baseOffset + regionSize

      const conflictEntry: MergeConflict = {
        id: makeConflictId(),
        baseStart,
        baseEnd,
        leftContent: leftPart,
        rightContent: rightPart,
        selectedSide: 'left',
        resolved: false,
      }
      conflicts.push(conflictEntry)

      // Default: show left side in merged output
      mergedLines.push(...leftPart)
      baseOffset = baseEnd
    }
  }

  const mergedText = mergedLines.join('\n')

  return {
    baseText,
    mergedText,
    changes,
    conflicts,
    totalLines: mergedLines.length,
    hasConflicts: conflicts.length > 0,
  }
}

export function resolveConflict(
  result: MergeResult,
  conflictId: number,
  side: 'left' | 'right' | 'both'
): MergeResult {
  const conflict = result.conflicts.find(c => c.id === conflictId)
  if (!conflict) return result

  conflict.selectedSide = side
  conflict.resolved = true

  // Rebuild merged text
  const baseLines = result.baseText.split('\n')
  const mergedLines: string[] = []

  // Process all regions in order
  let offset = 0
  const allRegions: Array<{
    start: number
    end: number
    lines: string[]
    isConflict: boolean
    conflictId?: number
  }> = []

  // Add changes
  for (const change of result.changes) {
    allRegions.push({
      start: change.baseStart,
      end: change.baseEnd,
      lines: change.leftSelected ? change.leftContent : change.rightContent,
      isConflict: false,
    })
  }

  // Add conflicts
  for (const c of result.conflicts) {
    allRegions.push({
      start: c.baseStart,
      end: c.baseEnd,
      lines: c.selectedSide === 'left'
        ? c.leftContent
        : c.selectedSide === 'right'
          ? c.rightContent
          : [...c.leftContent, ...c.rightContent],
      isConflict: true,
      conflictId: c.id,
    })
  }

  // Sort by start position
  allRegions.sort((a, b) => a.start - b.start)

  for (const region of allRegions) {
    // Add unchanged base lines before this region
    while (offset < region.start && offset < baseLines.length) {
      mergedLines.push(baseLines[offset])
      offset++
    }
    // Add the region's lines
    mergedLines.push(...region.lines)
    offset = region.end
  }

  // Add remaining base lines
  while (offset < baseLines.length) {
    mergedLines.push(baseLines[offset])
    offset++
  }

  return {
    ...result,
    mergedText: mergedLines.join('\n'),
  }
}

export function getMergeStats(result: MergeResult) {
  return {
    totalChanges: result.changes.length,
    leftOnly: result.changes.filter(c => c.type === 'left-only').length,
    rightOnly: result.changes.filter(c => c.type === 'right-only').length,
    conflicts: result.conflicts.length,
    resolvedConflicts: result.conflicts.filter(c => c.resolved).length,
    unresolvedConflicts: result.conflicts.filter(c => !c.resolved).length,
  }
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd D:\AI\agent-chat
npx tsc --noEmit src/utils/merge.ts 2>&1 | head -20
```

Expected: No errors (or only warnings about missing node-diff3 types — handled by `@types/node-diff3`).

- [ ] **Step 3: Commit**

```bash
git add src/utils/merge.ts
git commit -m "feat: add three-way merge utility with node-diff3"
```

---

## Task 3: Create Merge Editor Component (`src/components/merge/MergeEditor.vue`)

**Files:**
- Create: `src/components/merge/MergeEditor.vue`

**Interfaces:**
- Consumes: `MergeResult`, `MergeChange`, `MergeConflict` from `src/utils/merge.ts`, `monaco-editor-vue3` components
- Produces: `MergeEditor` Vue component (used by FileCompare.vue in Task 4)

- [ ] **Step 1: Create the MergeEditor component**

```vue
<!-- src/components/merge/MergeEditor.vue -->
<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
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
  // Build a "compare" view: show left-only + right-only changes
  // We show the merged view from left perspective
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
    resultDecs.value, resultDecs
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
  // Reset all changes to use base content
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
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd D:\AI\agent-chat
npx vue-tsc --noEmit 2>&1 | grep -i "merge\|MergeEditor" | head -20
```

Expected: No errors related to MergeEditor.

- [ ] **Step 3: Commit**

```bash
git add src/components/merge/MergeEditor.vue
git commit -m "feat: add MergeEditor component with Monaco diff view and conflict resolution"
```

---

## Task 4: Rewrite FileCompare.vue for Multi-Version Merge

**Files:**
- Modify: `src/views/FileCompare.vue`

**Interfaces:**
- Consumes: `MergeEditor` from `src/components/merge/MergeEditor.vue`, `computeThreeWayMerge` from `src/utils/merge.ts`
- Produces: Updated `FileCompare` view with multi-version management (used by router in Task 5)

- [ ] **Step 1: Rewrite FileCompare.vue with multi-version merge support**

The full file replacement (660+ lines) will contain:

1. **Script section:**
   - Version management: `versions[]` array with `{ id, name, content }` objects
   - File import: `handleFileImport(event, versionId)`, drag-and-drop per version
   - Base/Compare selection: `selectedBase`, `selectedCompare` refs
   - Merge computation: `watch([selectedBase, selectedCompare], computeMerge)`
   - Merge state: `mergeResult` ref of type `MergeResult | null`
   - `addVersion()`, `removeVersion(id)`, `renameVersion(id, name)`
   - `handleExport(content)`: download merged content as file
   - `importFromChat(content)`: add as new version

2. **Template section:**
   - Left sidebar: version list with add/remove/rename, file import buttons
   - Top toolbar: base selector, compare selector, merge stats
   - Main area: `MergeEditor` component (three-pane Monaco view)
   - Conflict panel: inline conflict resolution (below MergeEditor)
   - Empty state: when no versions loaded

3. **Style section:**
   - Two-column layout: left sidebar (250px) + main area
   - Version list styling with drag indicators
   - Monaco editor integration styles
   - Reuse existing `doubao-*` CSS variables

Key code structure:

```vue
<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useConversationStore } from '@/stores/conversation'
import { computeThreeWayMerge, type MergeResult } from '@/utils/merge'
import MergeEditor from '@/components/merge/MergeEditor.vue'
import {
  Operation, Document, Edit, Files, Position, Plus, Delete, CopyDocument,
} from '@element-plus/icons-vue'
import { Upload as UploadIcon } from '@element-plus/icons-vue'
import type { ContentBlock } from '@/events/types'

interface Version {
  id: string
  name: string
  content: string
  fileInput: HTMLInputElement | null
}

const store = useConversationStore()

// Version management
const versions = ref<Version[]>([])
let versionIdCounter = 0

function addVersion(name?: string) {
  const id = `v-${++versionIdCounter}`
  versions.value.push({
    id,
    name: name || `版本 ${versions.value.length + 1}`,
    content: '',
    fileInput: null,
  })
}

function removeVersion(id: string) {
  versions.value = versions.value.filter(v => v.id !== id)
  if (selectedBase.value === id) selectedBase.value = versions.value[0]?.id || ''
  if (selectedCompare.value === id) selectedCompare.value = versions.value[1]?.id || ''
}

function renameVersion(id: string, name: string) {
  const v = versions.value.find(v => v.id === id)
  if (v) v.name = name
}

// Selection
const selectedBase = ref('')
const selectedCompare = ref('')

// Merge result
const mergeResult = ref<MergeResult | null>(null)

// Compute merge when selections change
watch([selectedBase, selectedCompare], ([baseId, compareId]) => {
  if (!baseId || !compareId) {
    mergeResult.value = null
    return
  }

  const base = versions.value.find(v => v.id === baseId)
  const compare = versions.value.find(v => v.id === compareId)

  if (!base || !compare) {
    mergeResult.value = null
    return
  }

  mergeResult.value = computeThreeWayMerge(
    base.content,
    base.content, // left = base (unchanged)
    compare.content // right = compare version
  )
}, { immediate: true })

// File import
function handleFileImport(event: Event, versionId: string) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const v = versions.value.find(v => v.id === versionId)
    if (v) {
      v.content = reader.result as string
      v.name = file.name
    }
  }
  reader.readAsText(file)
}

function triggerFileSelect(version: Version) {
  // Create file input if not exists
  if (!version.fileInput) {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.ts,.js,.jsx,.tsx,.vue,.html,.css,.json,.md,.py,.go,.java,.yaml,.yml,.xml,.sh,.sql,.c,.cpp,.h,.cs,.rb,.rs,.swift,.kt,.dart,.php,.log,.cfg,.ini,.env,.csv'
    input.onchange = (e) => handleFileImport(e, version.id)
    version.fileInput = input
  }
  version.fileInput.value = ''
  version.fileInput.click()
}

function clearAll() {
  versions.value = []
  selectedBase.value = ''
  selectedCompare.value = ''
  mergeResult.value = null
  addVersion('Base')
  addVersion('Version B')
}

// Import from chat
function importFromChat(content: string) {
  addVersion(`Chat ${versions.value.length + 1}`)
  const v = versions.value[versions.value.length - 1]
  v.content = content
}

// Export
function handleExport(content: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `merged-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

function handleMergeResultUpdate(result: MergeResult) {
  mergeResult.value = result
}

// Initialize with 2 empty versions
if (versions.value.length === 0) {
  addVersion('Base')
  addVersion('Version B')
}
</script>
```

The template and styles will be a complete rewrite with the two-panel layout described above.

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd D:\AI\agent-chat
npx vue-tsc --noEmit 2>&1 | grep -i "FileCompare\|file-compare" | head -20
```

Expected: No errors related to FileCompare.

- [ ] **Step 3: Verify build passes**

```bash
cd D:\AI\agent-chat
npx vite build 2>&1 | tail -10
```

Expected: Build succeeds with output size warning (normal for Monaco).

- [ ] **Step 4: Commit**

```bash
git add src/views/FileCompare.vue
git commit -m "feat: rewrite FileCompare with multi-version merge and Monaco editor"
```

---

## Task 5: Update Router (No Changes Needed)

**Files:**
- No changes required (router already points to `/compare` → `FileCompare.vue`)

The existing router in `src/router/index.ts` already has:
```typescript
{
  path: '/compare',
  name: 'file-compare',
  component: FileCompare,
}
```

Since FileCompare.vue is rewritten in-place, the router continues to work. No changes needed.

- [ ] **Step 1: Verify routing works**

```bash
cd D:\AI\agent-chat
npx vite dev &
# Visit http://localhost:5173/#/compare
```

Expected: FileCompare page loads with the new multi-version merge UI.

- [ ] **Step 2: Skip commit (no changes)**

---

## Task 6: Monaco Editor Worker Configuration

**Files:**
- Modify: `vite.config.ts`

Monaco editor requires web workers for language services. Vite needs specific configuration to handle Monaco workers.

- [ ] **Step 1: Add Monaco worker plugin to Vite config**

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/v1': {
        target: 'https://apihub.agnes-ai.com',
        changeOrigin: true,
      },
    },
  },
  // Monaco editor worker configuration
  optimizeDeps: {
    include: ['monaco-editor'],
  },
})
```

- [ ] **Step 2: Add Monaco worker initialization in MergeEditor.vue**

Add to the `<script setup>` section of MergeEditor.vue, before editor creation:

```typescript
// Monaco worker setup
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker()
  },
}
```

- [ ] **Step 3: Verify Monaco editors load correctly**

```bash
cd D:\AI\agent-chat
npx vite dev &
# Visit http://localhost:5173/#/compare
# Add two versions, select base and compare
# Verify three Monaco editor panels render
```

Expected: Three editor panels visible, Monaco syntax highlighting active.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts src/components/merge/MergeEditor.vue
git commit -m "fix: configure Monaco editor workers for Vite"
```

---

## Task 7: Integration Testing and Polish

**Files:**
- Modify: `src/views/FileCompare.vue` (polish)
- Modify: `src/components/merge/MergeEditor.vue` (polish)

- [ ] **Step 1: Test three-way merge with sample data**

Create test cases in the browser:
1. Add 3 versions with different content
2. Select Base and Version 2 as compare
3. Verify merge result shows correct combination
4. Test conflict resolution: change both versions differently on same lines
5. Test accept/reject all buttons
6. Test export functionality

- [ ] **Step 2: Test file import workflow**

1. Click "导入文件" on a version
2. Select a `.ts` or `.json` file
3. Verify content loads into the version
4. Verify Monaco syntax highlighting activates
5. Repeat for second version
6. Verify merge result updates

- [ ] **Step 3: Test edge cases**

1. Empty versions → show empty state
2. Identical versions → show "no changes" message
3. Very large files (>1000 lines) → verify performance
4. Binary/non-text files → show error message
5. Base and compare same file → show "identical" message

- [ ] **Step 4: Verify dark mode**

1. Toggle dark mode in the app
2. Verify Monaco editors switch to dark theme
3. Verify merge toolbar and conflict panel adapt

- [ ] **Step 5: Final build verification**

```bash
cd D:\AI\agent-chat
npx vite build 2>&1 | tail -10
```

Expected: Build succeeds. Output may be large due to Monaco (~2-3MB gzipped is normal).

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete multi-version merge editor with Monaco and node-diff3"
```

---

## Summary of Deliverables

| Task | File | Action | Description |
|------|------|--------|-------------|
| 1 | `package.json` | Modify | Add node-diff3, monaco-editor, monaco-editor-vue3 |
| 2 | `src/utils/merge.ts` | Create | Three-way merge utility with node-diff3 |
| 3 | `src/components/merge/MergeEditor.vue` | Create | Monaco editor component with conflict resolution |
| 4 | `src/views/FileCompare.vue` | Rewrite | Multi-version management + merge integration |
| 5 | Router | No change | Already configured |
| 6 | `vite.config.ts` | Modify | Monaco worker configuration |
| 7 | Integration | Test | End-to-end testing and polish |
