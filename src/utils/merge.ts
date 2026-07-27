// src/utils/merge.ts
import { diff3MergeRegions } from 'node-diff3'

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
  compareText: string
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

interface Diff3Region {
  stable: boolean
  buffer?: 'a' | 'b' | 'o'
  bufferStart?: number
  bufferLength?: number
  bufferContent?: string[]
  aStart?: number
  aLength?: number
  aContent?: string[]
  oStart?: number
  oLength?: number
  oContent?: string[]
  bStart?: number
  bLength?: number
  bContent?: string[]
}

export function computeThreeWayMerge(
  baseText: string,
  leftText: string,
  rightText: string
): MergeResult {
  const baseLines = baseText.split('\n')
  const leftLines = leftText.split('\n')
  const rightLines = rightText.split('\n')

  const regions: Diff3Region[] = diff3MergeRegions(leftLines, rightLines, baseLines)

  const changes: MergeChange[] = []
  const conflicts: MergeConflict[] = []
  const mergedLines: string[] = []

  // Pre-scan: collect "o" and conflict regions which give exact base positions
  const knownBasePositions: Array<{
    index: number
    baseStart: number
    baseEnd: number
  }> = []

  for (let i = 0; i < regions.length; i++) {
    const r = regions[i]
    if (r.stable && r.buffer === 'o') {
      knownBasePositions.push({
        index: i,
        baseStart: r.bufferStart!,
        baseEnd: r.bufferStart! + r.bufferLength!,
      })
    } else if (!r.stable) {
      knownBasePositions.push({
        index: i,
        baseStart: r.oStart!,
        baseEnd: r.oStart! + r.oLength!,
      })
    }
  }

  function getBaseRange(regionIndex: number): {
    baseStart: number
    baseEnd: number
  } {
    const r = regions[regionIndex]
    if (r.stable && r.buffer === 'o') {
      return { baseStart: r.bufferStart!, baseEnd: r.bufferStart! + r.bufferLength! }
    }
    if (!r.stable) {
      return { baseStart: r.oStart!, baseEnd: r.oStart! + r.oLength! }
    }
    // "a" or "b" region: base range is between surrounding known positions
    const prevKnown = knownBasePositions.filter(k => k.index < regionIndex).pop()
    const nextKnown = knownBasePositions.find(k => k.index > regionIndex)
    return {
      baseStart: prevKnown ? prevKnown.baseEnd : 0,
      baseEnd: nextKnown ? nextKnown.baseStart : baseLines.length,
    }
  }

  for (let i = 0; i < regions.length; i++) {
    const r = regions[i]

    if (r.stable && r.buffer === 'o') {
      // Common region - unchanged from original
      mergedLines.push(...r.bufferContent!)
    } else if (r.stable && (r.buffer === 'a' || r.buffer === 'b')) {
      // Left-only or right-only change
      const { baseStart, baseEnd } = getBaseRange(i)
      const content = r.bufferContent!
      const side = r.buffer === 'a' ? 'left-only' : 'right-only'

      // Skip common regions (where base content matches)
      const baseSlice = baseLines.slice(baseStart, baseEnd).join('\n')
      if (content.join('\n') === baseSlice) {
        mergedLines.push(...content)
        continue
      }

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
    } else if (!r.stable) {
      // Conflict
      const { baseStart, baseEnd } = getBaseRange(i)
      const leftPart = r.aContent || []
      const rightPart = r.bContent || []

      conflicts.push({
        id: makeConflictId(),
        baseStart,
        baseEnd,
        leftContent: leftPart,
        rightContent: rightPart,
        selectedSide: 'left',
        resolved: false,
      })

      mergedLines.push(...leftPart)
    }
  }

  const mergedText = mergedLines.join('\n')

  return {
    baseText,
    compareText: rightText,
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
  }> = []

  for (const change of result.changes) {
    allRegions.push({
      start: change.baseStart,
      end: change.baseEnd,
      lines: change.leftSelected ? change.leftContent : change.rightContent,
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

export function resolveConflictByIndex(
  result: MergeResult,
  index: number,
  side: 'left' | 'right' | 'both'
): MergeResult {
  const conflict = result.conflicts[index]
  if (!conflict) return result
  return resolveConflict(result, conflict.id, side)
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
