import type { GenUISchema } from '@/events/types'

const GENUI_CODE_BLOCK = /```genui\s*\n?([\s\S]*?)\n?\s*```/

/**
 * State-machine incremental JSON parser.
 * Tracks what token is expected next so it can always close
 * the structure with sensible defaults, even mid-stream.
 */
function tryParsePartialJson(text: string): unknown | null {
  try { return JSON.parse(text) } catch { /* continue */ }

  let result = ''
  let inString = false
  let escape = false
  let expectValue = false
  let lastSignificant = ''
  let depth = 0
  const stack: string[] = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escape) {
      result += ch
      escape = false
      continue
    }
    if (inString) {
      if (ch === '\\') { escape = true; result += ch; continue }
      if (ch === '"') { inString = false; result += ch; lastSignificant = ch; continue }
      result += ch
      continue
    }

    if (ch === '"') {
      inString = true
      if (expectValue) { expectValue = false }
      result += ch
      continue
    }

    if (ch === '{' || ch === '[') {
      const close = ch === '{' ? '}' : ']'
      stack.push(close)
      depth++
      expectValue = true
      result += ch
      lastSignificant = ch
      continue
    }

    if (ch === '}' || ch === ']') {
      if (stack.length > 0) {
        stack.pop()
        depth--
        result += ch
        lastSignificant = ch
      }
      continue
    }

    if (ch === ':') {
      expectValue = true
      result += ch
      lastSignificant = ch
      continue
    }

    if (ch === ',') {
      result += ch
      lastSignificant = ch
      continue
    }

    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') {
      result += ch
      continue
    }

    if (expectValue && (ch === 't' || ch === 'f' || ch === 'n' || ch === '-' || (ch >= '0' && ch <= '9'))) {
      expectValue = false
      let word = ch
      while (i + 1 < text.length) {
        const next = text[i + 1]
        if (next === ',' || next === '}' || next === ']' || next === ' ' || next === '\n') break
        word += next
        i++
      }
      result += word
      lastSignificant = word[word.length - 1]
      continue
    }

    result += ch
    lastSignificant = ch
  }

  // Close unclosed string
  if (inString) result += '"'

  // Remove trailing commas
  result = result.replace(/,(\s*[}\]])/g, '$1')

  // Determine what we need to close
  const tail = result.trimEnd()
  const lastChar = tail[tail.length - 1]

  // If we stopped mid-key, remove incomplete key
  let closing = ''
  if (lastChar === ':' || expectValue) {
    // Stopped after colon or in middle of key — remove trailing colon+key
    const colonIdx = result.lastIndexOf(':')
    if (colonIdx !== -1) {
      // Find the key before this colon
      const beforeColon = result.slice(0, colonIdx).trimEnd()
      if (beforeColon.endsWith('"')) {
        // Find start of that key
        const keyStart = beforeColon.lastIndexOf('"', beforeColon.length - 2)
        const commaBefore = result.lastIndexOf(',', keyStart)
        if (commaBefore !== -1 && commaBefore < keyStart) {
          result = result.slice(0, commaBefore)
        } else {
          result = result.slice(0, keyStart > 0 ? keyStart - 1 : 0)
        }
      } else {
        result = result.slice(0, colonIdx)
      }
    }
    closing = stack.reverse().join('')
  } else {
    // Remove trailing incomplete primitive word
    const primitiveTail = result.match(/[\w.-]+$/)
    if (primitiveTail && !['true', 'false', 'null'].includes(primitiveTail[0])) {
      result = result.slice(0, result.length - primitiveTail[0].length)
    }
    // Remove trailing comma before closing
    result = result.replace(/,\s*$/, '')
    closing = stack.reverse().join('')
  }

  const fixed = result + closing
  try {
    return JSON.parse(fixed)
  } catch {
    return null
  }
}

function findJsonObject(text: string): string | null {
  let depth = 0
  let start = -1

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '{') {
      if (depth === 0) start = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        return text.slice(start, i + 1)
      }
    }
  }

  if (start !== -1) {
    return text.slice(start)
  }
  return null
}

export function detectGenUI(text: string): { detected: boolean; schema?: GenUISchema; message?: string } {
  const codeBlockMatch = text.match(GENUI_CODE_BLOCK)
  if (codeBlockMatch) {
    const parsed = tryParsePartialJson(codeBlockMatch[1])
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>
      if (obj.schema && typeof obj.schema === 'object' && (obj.schema as Record<string, unknown>).componentName) {
        return { detected: true, schema: obj.schema as GenUISchema, message: obj.message as string }
      }
      if (obj.componentName) {
        return { detected: true, schema: parsed as GenUISchema }
      }
    }
  }

  if (text.includes('"componentName"')) {
    const jsonStr = findJsonObject(text)
    if (jsonStr) {
      const parsed = tryParsePartialJson(jsonStr)
      if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>
        if (obj.type === 'genui' && obj.schema) {
          return { detected: true, schema: obj.schema as GenUISchema, message: obj.message as string }
        }
        if (obj.componentName) {
          return { detected: true, schema: parsed as GenUISchema }
        }
      }
    }
  }

  return { detected: false }
}

export function parseGenUISchema(raw: string): GenUISchema | null {
  const parsed = tryParsePartialJson(raw)
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>
    if (obj.schema && typeof obj.schema === 'object' && (obj.schema as Record<string, unknown>).componentName) {
      return obj.schema as GenUISchema
    }
    if (obj.componentName) {
      return parsed as GenUISchema
    }
  }
  return null
}

export function isGenUIStreaming(text: string): boolean {
  return text.includes('"componentName"') || text.includes('```genui')
}
