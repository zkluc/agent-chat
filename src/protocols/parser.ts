import type { AgentScopeEvent } from '@/events/types'
import { detectGenUI } from '@/utils/genui'

let idCounter = 0
function generateId(): string {
  return `evt_${Date.now()}_${++idCounter}`
}
function now(): string {
  return new Date().toISOString()
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

export function parseSSELine(line: string): AgentScopeEvent | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith(':')) return null

  let jsonStr = trimmed
  if (trimmed.startsWith('data: ')) {
    jsonStr = trimmed.slice(6)
  }
  if (trimmed.startsWith('data:')) {
    jsonStr = trimmed.slice(5)
  }

  if (jsonStr === '[DONE]') {
    return {
      id: generateId(),
      reply_id: '',
      created_at: now(),
      type: 'reply_end' as const,
      session_id: '',
    }
  }

  try {
    const raw = JSON.parse(jsonStr)
    return mapRawToEvent(raw)
  } catch {
    return null
  }
}

export function parseSSEChunk(buffer: string): { events: AgentScopeEvent[]; remainder: string } {
  const events: AgentScopeEvent[] = []
  const lines = buffer.split('\n')
  const remainder = lines.pop() || ''

  for (const line of lines) {
    const event = parseSSELine(line)
    if (event) events.push(event)
  }

  return { events, remainder }
}

function mapRawToEvent(raw: Record<string, unknown>): AgentScopeEvent {
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

      // role 发送（首条 chunk）
      if (delta.role) {
        return {
          ...base,
          type: 'reply_start' as const,
          session_id: (raw.session_id as string) || '',
          name: 'Agent',
          role: delta.role as string,
        }
      }

      // 文本增量
      if (typeof delta.content === 'string' && delta.content) {
        return {
          ...base,
          type: 'text_block_delta' as const,
          block_id: (raw.id as string) || base.id,
          delta: delta.content,
        }
      }

      // 工具调用增量
      if (delta.tool_calls) {
        const toolCalls = delta.tool_calls as { index: number; id?: string; function?: { name?: string; arguments?: string } }[]
        for (const tc of toolCalls) {
          if (tc.id) {
            return {
              ...base,
              type: 'tool_call_start' as const,
              tool_call_id: tc.id,
              tool_call_name: tc.function?.name || 'unknown',
            }
          }
          if (tc.function?.arguments) {
            return {
              ...base,
              type: 'tool_call_delta' as const,
              tool_call_id: `tc_${base.id}_${tc.index}`,
              delta: tc.function.arguments,
            }
          }
        }
      }

      // 完成
      if (choice.finish_reason) {
        return {
          ...base,
          type: 'reply_end' as const,
          session_id: (raw.session_id as string) || '',
        }
      }
    }
  }

  // ── AgentScope 2.0 event format ──
  const status = raw.status as string | undefined
  const object = raw.object as string | undefined
  const eventType = raw.event as string | undefined

  if (eventType === 'reply_start' || (object === 'response' && status === 'created')) {
    return {
      ...base,
      type: 'reply_start' as const,
      session_id: (raw.session_id as string) || '',
      name: (raw.name as string) || 'Agent',
      role: (raw.role as string) || 'assistant',
    }
  }

  if (eventType === 'reply_end' || (object === 'response' && status === 'completed')) {
    return {
      ...base,
      type: 'reply_end' as const,
      session_id: (raw.session_id as string) || '',
    }
  }

  if (raw.content && Array.isArray(raw.content)) {
    const content = raw.content as Record<string, unknown>[]
    const first = content[0]
    if (first?.type === 'text' && first.text) {
      return {
        ...base,
        type: 'text_block_delta' as const,
        block_id: (first.id as string) || base.id,
        delta: first.text as string,
      }
    }
    if (first?.type === 'tool_use' || first?.type === 'tool_call') {
      return {
        ...base,
        type: 'tool_call_start' as const,
        tool_call_id: (first.id as string) || base.id,
        tool_call_name: (first.name as string) || 'unknown',
      }
    }
  }

  if (raw.type === 'text_block_delta' || raw.type === 'text') {
    return {
      ...base,
      type: 'text_block_delta' as const,
      block_id: (raw.block_id as string) || base.id,
      delta: (raw.delta as string) || (raw.text as string) || '',
    }
  }

  if (raw.type === 'tool_call_delta') {
    return {
      ...base,
      type: 'tool_call_delta' as const,
      tool_call_id: (raw.tool_call_id as string) || base.id,
      delta: (raw.delta as string) || '',
    }
  }

  if (raw.type === 'tool_result_end') {
    return {
      ...base,
      type: 'tool_result_end' as const,
      tool_call_id: (raw.tool_call_id as string) || base.id,
      state: (raw.state as 'success' | 'error' | 'running' | 'interrupted' | 'denied') || 'success',
    }
  }

  return {
    ...base,
    type: 'custom' as const,
    name: (raw.type as string) || (raw.event as string) || 'unknown',
    value: raw,
  }
}
