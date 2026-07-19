import type { AgentScopeEvent } from '@/events/types'

export type ProtocolType = 'sse' | 'websocket' | 'ndjson'

export interface ConnectionOptions {
  headers?: Record<string, string>
  body?: Record<string, unknown>
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export type StreamStatus = 'idle' | 'connecting' | 'connected' | 'streaming' | 'disconnected' | 'error'

export interface StreamProtocol {
  readonly status: StreamStatus
  connect(url: string, options?: ConnectionOptions): void
  send(data: unknown): void
  close(): void
  onMessage(handler: (event: AgentScopeEvent) => void): () => void
  onError(handler: (error: Error) => void): () => void
  onClose(handler: () => void): () => void
  onStatusChange(handler: (status: StreamStatus) => void): () => void
}

export interface ChatRequest {
  input: { role: string; content: { type: string; text: string }[] }[]
  session_id: string
  user_id: string
  stream?: boolean
  model?: string
  channel?: string
}

export interface ChatResponse {
  sequence_number: number
  object: string
  status: 'created' | 'in_progress' | 'completed' | 'failed'
  output?: { role: string; content: { type: string; text?: string; [key: string]: unknown }[] }[]
  error?: string
  session_id?: string
  usage?: { input_tokens: number; output_tokens: number }
}
