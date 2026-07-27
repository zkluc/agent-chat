export function computeDiff(oldStr: string, newStr: string) {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')
  const n = oldLines.length
  const m = newLines.length

  if (n === 0 && m === 0) return []

  // Build LCS table using dynamic programming with space optimization
  // We need full table for backtracking, so we store it
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack to find diff operations
  interface DiffOp { type: 'same' | 'insert' | 'delete'; content: string }
  const ops: DiffOp[] = []

  let i = n, j = m
  const stack: DiffOp[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({ type: 'same', content: oldLines[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'insert', content: newLines[j - 1] })
      j--
    } else {
      stack.push({ type: 'delete', content: oldLines[i - 1] })
      i--
    }
  }

  // Reverse stack to get correct order
  while (stack.length > 0) {
    ops.push(stack.pop() as DiffOp)
  }

  return ops
}

// Group consecutive same-line ops into chunks for cleaner output
interface DiffChunk {
  lines: Array<{ content: string; type: 'same' | 'insert' | 'delete' }>
  headerLine?: string
}

export function groupDiff(ops: Array<{ type: 'same' | 'insert' | 'delete'; content: string }>): DiffChunk[] {
  const chunks: DiffChunk[] = []
  if (ops.length === 0) return chunks

  let current: DiffChunk = { lines: [] }
  let firstLineNum = 1
  let oldIdx = 0, newIdx = 0
  let opIdx = 0

  for (const op of ops) {
    if (op.type === 'same') {
      if (current.lines.length > 0 && current.lines[0].type !== 'same') {
        // We're entering "same" territory after inserts/deletes, push previous chunk
        chunks.push(current)
        current = { lines: [] }
      }
      current.lines.push(op)
      oldIdx++
      newIdx++
    } else if (op.type === 'delete') {
      if (!current.headerLine && current.lines.length === 0) {
        current.headerLine = `-${firstLineNum}`
        firstLineNum = oldIdx + 1
      }
      current.lines.push({ ...op, content: op.content })
      oldIdx++
    } else if (op.type === 'insert') {
      if (!current.headerLine && current.lines.length === 0) {
        current.headerLine = `+${newIdx + 1}`
        firstLineNum = newIdx + 2
      }
      current.lines.push({ ...op, content: op.content })
      newIdx++
    }
    opIdx++
  }

  if (current.lines.length > 0) {
    chunks.push(current)
  }

  return chunks
}

// Simple unified diff output (lines array for rendering)
export interface DiffLine {
  oldNum?: number
  newNum?: number
  content: string
  type: 'context' | 'oldOnly' | 'newOnly'
}

export function toUnifiedDiff(oldStr: string, newStr: string): DiffLine[] {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')
  const n = oldLines.length
  const m = newLines.length

  if (n === 0 && m === 0) return []

  // Build LCS table
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack
  interface Step { oldIdx: number; newIdx: number; line?: string; oldLine?: boolean; newLine?: boolean }
  const steps: Step[] = []
  let i = n, j = m

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      steps.push({ oldIdx: i, newIdx: j, line: oldLines[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      steps.push({ oldIdx: i, newIdx: j, line: newLines[j - 1], newLine: true })
      j--
    } else {
      steps.push({ oldIdx: i, newIdx: j, line: oldLines[i - 1], oldLine: true })
      i--
    }
  }

  steps.reverse()

  // Convert steps to unified diff format with line numbers
  const result: DiffLine[] = []
  let ctxStart = 0
  const CONTEXT_THRESHOLD = 3

  // Collect runs of changes
  type ChangeRun = { deletes: number; inserts: number; ctxAfter: number }
  const runs: ChangeRun[] = []
  
  let phase = 'ctx' // 'ctx', 'del', 'ins'
  let dCount = 0, iCount = 0, cAfter = 0
  
  for (const s of steps) {
    if (s.oldLine && !s.newLine) {
      if (phase === 'ctx') {
        if (cAfter > 0) {
          runs.push({ deletes: dCount, inserts: iCount, ctxAfter: cAfter })
          dCount = 0; iCount = 0; cAfter = 0
        }
        phase = 'del'
      }
      dCount++
    } else if (s.newLine && !s.oldLine) {
      if (phase === 'ctx') {
        if (cAfter > 0) {
          runs.push({ deletes: dCount, inserts: iCount, ctxAfter: cAfter })
          dCount = 0; iCount = 0; cAfter = 0
        }
        phase = 'ins'
      }
      iCount++
    } else {
      // context line (both old and new)
      if (phase !== 'ctx' && cAfter === 0) {
        // end of a change run, but we keep up to CONTEXT_THRESHOLD context
        cAfter = 1
      } else if (phase === 'ctx') {
        cAfter++
      }
    }
  }
  
  if (dCount > 0 || iCount > 0 || cAfter > 0) {
    runs.push({ deletes: dCount, inserts: iCount, ctxAfter: cAfter })
  }

  // If no changes found, show all lines as context
  if (runs.length === 0) {
    let num = 1
    for (const l of oldLines) {
      result.push({ oldNum: num, newNum: num, content: l, type: 'context' })
      num++
    }
    return result
  }

  let oldPos = 1
  let newPos = 1
  let runIdx = 0

  for (runIdx = 0; runIdx < runs.length; runIdx++) {
    const run = runs[runIdx]
    
    // Before the first run, dump all contexts as plain
    if (runIdx === 0) {
      for (let k = 0; k < oldLines.length - run.deletes && k < run.ctxAfter; k++, oldPos++, newPos++) {
        result.push({ oldNum: oldPos, newNum: newPos, content: oldLines[k - 1], type: 'context' })
      }
      // Actually let me rebuild this more carefully
    }
  }

  // Redo with a cleaner approach
  result.length = 0
  oldPos = 1
  newPos = 1

  for (let r = 0; r < runs.length; r++) {
    const run = runs[r]
    const isLast = r === runs.length - 1
    const showCtxBefore = run.ctxAfter > 0 && (isLast || runs[r + 1]?.ctxAfter! > 0)
    const showCtxAfter = showCtxBefore
    
    // Context before (if needed)
    if (showCtxBefore) {
      const startPos = oldPos
      const startNewPos = newPos
      const lines = Math.min(run.ctxAfter, oldLines.length - (oldPos - 1))
      for (let k = 0; k < lines; k++) {
        result.push({ oldNum: oldPos, newNum: newPos, content: oldLines[oldPos - 1], type: 'context' })
        oldPos++; newPos++
      }
    }

    // Deletes
    for (let k = 0; k < run.deletes; k++) {
      result.push({ oldNum: oldPos, content: oldLines[oldPos - 1], type: 'oldOnly' })
      oldPos++
    }

    // Inserts
    for (let k = 0; k < run.inserts; k++) {
      result.push({ newNum: newPos, content: newLines[newPos - 1], type: 'newOnly' })
      newPos++
    }

    // Context after (if needed and available)
    if (showCtxAfter && !isLast) {
      const lines = Math.min(run.ctxAfter, oldLines.length - (oldPos - 1))
      for (let k = 0; k < lines; k++) {
        result.push({ oldNum: oldPos, newNum: newPos, content: oldLines[oldPos - 1], type: 'context' })
        oldPos++; newPos++
      }
    }
  }

  // Remaining context lines after last run
  if (oldPos <= oldLines.length) {
    while (oldPos <= oldLines.length && newPos <= newLines.length) {
      result.push({ oldNum: oldPos, newNum: newPos, content: oldLines[oldPos - 1], type: 'context' })
      oldPos++; newPos++
    }
  }

  return result
}
