import type { StreamProtocol, ConnectionOptions, StreamStatus } from './types'
import type { AgentScopeEvent } from '@/events/types'
import { parseSSEChunk } from './parser'

type Handler<T> = (data: T) => void

export class SSEAdapter implements StreamProtocol {
  private _status: StreamStatus = 'idle'
  private abortController: AbortController | null = null
  private messageHandlers: Set<Handler<AgentScopeEvent>> = new Set()
  private errorHandlers: Set<Handler<Error>> = new Set()
  private closeHandlers: Set<Handler<void>> = new Set()
  private statusHandlers: Set<Handler<StreamStatus>> = new Set()
  private url = ''
  private options: ConnectionOptions = {}
  private buffer = ''

  get status(): StreamStatus {
    return this._status
  }

  private setStatus(s: StreamStatus) {
    this._status = s
    this.statusHandlers.forEach(h => h(s))
  }

  async connect(url: string, options?: ConnectionOptions) {
    this.url = url
    this.options = options || {}
    this.buffer = ''
    this.abortController = new AbortController()
    this.setStatus('connecting')

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...options?.headers,
        },
        body: JSON.stringify(options?.body || {}),
        signal: this.abortController.signal,
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      this.setStatus('connected')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No readable stream')

      const decoder = new TextDecoder()
      this.setStatus('streaming')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        this.buffer += decoder.decode(value, { stream: true })
        const { events, remainder } = parseSSEChunk(this.buffer)
        this.buffer = remainder

        for (const event of events) {
          this.messageHandlers.forEach(h => h(event))
        }
      }

      if (this.buffer.trim()) {
        const { events } = parseSSEChunk(this.buffer + '\n')
        for (const event of events) {
          this.messageHandlers.forEach(h => h(event))
        }
      }

      this.close()
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        this.setStatus('disconnected')
      } else {
        this.setStatus('error')
        this.errorHandlers.forEach(h => h(err as Error))
      }
    }
  }

  send(data: unknown) {
    if (this._status === 'connected' || this._status === 'streaming') {
      // For SSE, send is typically not used (unidirectional)
      console.warn('SSEAdapter: send() is not supported for SSE connections')
    }
  }

  close() {
    this.abortController?.abort()
    this.abortController = null
    this.buffer = ''
    this.setStatus('disconnected')
    this.closeHandlers.forEach(h => h())
  }

  onMessage(handler: Handler<AgentScopeEvent>): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onError(handler: Handler<Error>): () => void {
    this.errorHandlers.add(handler)
    return () => this.errorHandlers.delete(handler)
  }

  onClose(handler: Handler<void>): () => void {
    this.closeHandlers.add(handler)
    return () => this.closeHandlers.delete(handler)
  }

  onStatusChange(handler: Handler<StreamStatus>): () => void {
    this.statusHandlers.add(handler)
    return () => this.statusHandlers.delete(handler)
  }
}
