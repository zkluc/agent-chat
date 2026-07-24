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
      const content = ok as string[]
      const regionSize = content.length
      const baseStart = baseOffset
      const baseEnd = baseOffset + regionSize

      const baseSlice = baseLines.slice(baseStart, baseEnd).join('\n')
      const contentStr = content.join('\n')

      if (baseSlice === contentStr) {
        mergedLines.push(...content)
        baseOffset = baseEnd
        continue
      }

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

  const baseLines = result.baseText.split('\n')
  const mergedLines: string[] = []

  let offset = 0
  const allRegions: Array<{
    start: number
    end: number
    lines: string[]
    isConflict: boolean
    conflictId?: number
  }> = []

  for (const change of result.changes) {
    allRegions.push({
      start: change.baseStart,
      end: change.baseEnd,
      lines: change.leftSelected ? change.leftContent : change.rightContent,
      isConflict: false,
    })
  }

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

  allRegions.sort((a, b) => a.start - b.start)

  for (const region of allRegions) {
    while (offset < region.start && offset < baseLines.length) {
      mergedLines.push(baseLines[offset])
      offset++
    }
    mergedLines.push(...region.lines)
    offset = region.end
  }

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
