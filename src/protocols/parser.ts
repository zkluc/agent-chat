import type { AgentScopeEvent } from '@/events/types'
import { detectGenUI } from '@/utils/genui'

let idCounter = 0
function generateId(): string {
  return `evt_${Date.now()}_${++idCounter}`
}
function now(): string {
  return new Date().toISOString()
}

// Cache tool call IDs by index for OpenAI streaming format
const toolCallIdByIndex = new Map<number, string>()

export function clearToolCallIdCache() {
  toolCallIdByIndex.clear()
}

export function detectGenUIInText(text: string, blockId: string): AgentScopeEvent[] {
  const events: AgentScopeEvent[] = []
  const result = detectGenUI(text)

  if (result.detected && result.schema) {
    events.push({
      id: generateId(),
      reply_id: '',
      created_at: now(),
      type: 'custom' as const,
      name: 'genui',
      value: {
        block_id: blockId,
        schema: result.schema,
        message: result.message,
      },
    })
  }

  return events
}

export function parseSSELine(line: string): AgentScopeEvent[] {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith(':')) return []

  let jsonStr = trimmed
  if (trimmed.startsWith('data: ')) {
    jsonStr = trimmed.slice(6)
  }
  if (trimmed.startsWith('data:')) {
    jsonStr = trimmed.slice(5)
  }

  if (jsonStr === '[DONE]') {
    return [{
      id: generateId(),
      reply_id: '',
      created_at: now(),
      type: 'reply_end' as const,
      session_id: '',
    }]
  }

  try {
    const raw = JSON.parse(jsonStr)
    return mapRawToEvents(raw)
  } catch {
    return []
  }
}

export function parseSSEChunk(buffer: string): { events: AgentScopeEvent[]; remainder: string } {
  const events: AgentScopeEvent[] = []
  const lines = buffer.split('\n')
  const remainder = lines.pop() || ''

  for (const line of lines) {
    events.push(...parseSSELine(line))
  }

  return { events, remainder }
}

function mapRawToEvents(raw: Record<string, unknown>): AgentScopeEvent[] {
  const base = {
    id: (raw.id as string) || generateId(),
    reply_id: (raw.reply_id as string) || (raw.session_id as string) || '',
    created_at: (raw.created_at as string) || now(),
  }

  // ── OpenAI chat.completion.chunk format ──
  if (raw.object === 'chat.completion.chunk') {
    const choices = raw.choices as { index: number; delta: Record<string, unknown>; finish_reason: string | null }[] | undefined
    if (choices && choices.length > 0) {
      const choice = choices[0]
      const delta = choice.delta || {}
      const events: AgentScopeEvent[] = []

      // role chunk (first chunk) — clear tool call cache
      if (delta.role) {
        clearToolCallIdCache()
        events.push({
          ...base,
          type: 'reply_start' as const,
          session_id: (raw.session_id as string) || '',
          name: 'Agent',
          role: delta.role as string,
        })
      }

      // text content delta
      if (typeof delta.content === 'string' && delta.content) {
        events.push({
          ...base,
          type: 'text_block_delta' as const,
          block_id: (raw.id as string) || base.id,
          delta: delta.content,
        })
      }

      // tool calls — support multiple tool calls via index-based ID caching
      if (delta.tool_calls) {
        const toolCalls = delta.tool_calls as { index: number; id?: string; function?: { name?: string; arguments?: string } }[]
        for (const tc of toolCalls) {
          if (tc.id) {
            // First chunk for this tool call — has the real ID
            toolCallIdByIndex.set(tc.index, tc.id)
            events.push({
              ...base,
              type: 'tool_call_start' as const,
              tool_call_id: tc.id,
              tool_call_name: tc.function?.name || 'unknown',
            })
          }
          if (tc.function?.arguments) {
            // Argument delta — use the cached real ID for this index
            const realId = toolCallIdByIndex.get(tc.index) || `tc_${tc.index}`
            events.push({
              ...base,
              type: 'tool_call_delta' as const,
              tool_call_id: realId,
              delta: tc.function.arguments,
            })
          }
        }
      }

      // finish_reason
      if (choice.finish_reason) {
        if (choice.finish_reason === 'tool_calls') {
          // Don't emit reply_end here — agentic loop needs tool_calls info
          // Emit a custom event so the agentic loop can detect this
          events.push({
            ...base,
            type: 'custom' as const,
            name: 'tool_calls_finish',
            value: { finish_reason: 'tool_calls' },
          })
        }
        events.push({
          ...base,
          type: 'reply_end' as const,
          session_id: (raw.session_id as string) || '',
        })
      }

      return events
    }
  }

  // ── AgentScope 2.0 event format ──
  const status = raw.status as string | undefined
  const object = raw.object as string | undefined
  const eventType = raw.event as string | undefined

  if (eventType === 'reply_start' || (object === 'response' && status === 'created')) {
    clearToolCallIdCache()
    return [{
      ...base,
      type: 'reply_start' as const,
      session_id: (raw.session_id as string) || '',
      name: (raw.name as string) || 'Agent',
      role: (raw.role as string) || 'assistant',
    }]
  }

  if (eventType === 'reply_end' || (object === 'response' && status === 'completed')) {
    return [{
      ...base,
      type: 'reply_end' as const,
      session_id: (raw.session_id as string) || '',
    }]
  }

  if (raw.content && Array.isArray(raw.content)) {
    const content = raw.content as Record<string, unknown>[]
    const first = content[0]
    if (first?.type === 'text' && first.text) {
      return [{
        ...base,
        type: 'text_block_delta' as const,
        block_id: (first.id as string) || base.id,
        delta: first.text as string,
      }]
    }
    if (first?.type === 'tool_use' || first?.type === 'tool_call') {
      return [{
        ...base,
        type: 'tool_call_start' as const,
        tool_call_id: (first.id as string) || base.id,
        tool_call_name: (first.name as string) || 'unknown',
      }]
    }
  }

  if (raw.type === 'text_block_delta' || raw.type === 'text') {
    return [{
      ...base,
      type: 'text_block_delta' as const,
      block_id: (raw.block_id as string) || base.id,
      delta: (raw.delta as string) || (raw.text as string) || '',
    }]
  }

  if (raw.type === 'tool_call_delta') {
    return [{
      ...base,
      type: 'tool_call_delta' as const,
      tool_call_id: (raw.tool_call_id as string) || base.id,
      delta: (raw.delta as string) || '',
    }]
  }

  if (raw.type === 'tool_result_end') {
    return [{
      ...base,
      type: 'tool_result_end' as const,
      tool_call_id: (raw.tool_call_id as string) || base.id,
      state: (raw.state as 'success' | 'error' | 'running' | 'interrupted' | 'denied') || 'success',
    }]
  }

  return [{
    ...base,
    type: 'custom' as const,
    name: (raw.type as string) || (raw.event as string) || 'unknown',
    value: raw,
  }]
}
