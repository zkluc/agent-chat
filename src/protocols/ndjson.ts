import type { StreamProtocol, ConnectionOptions, StreamStatus } from './types'
import type { AgentScopeEvent } from '@/events/types'

type Handler<T> = (data: T) => void

export class NDJSONAdapter implements StreamProtocol {
  private _status: StreamStatus = 'idle'
  private abortController: AbortController | null = null
  private messageHandlers = new Set<Handler<AgentScopeEvent>>()
  private errorHandlers = new Set<Handler<Error>>()
  private closeHandlers = new Set<Handler<void>>()
  private statusHandlers = new Set<Handler<StreamStatus>>()
  private buffer = ''
  private url = ''
  private options: ConnectionOptions = {}

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
          'Accept': 'application/x-ndjson',
          ...options?.headers,
        },
        body: JSON.stringify(options?.body || {}),
        signal: this.abortController.signal,
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)

      this.setStatus('connected')
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No readable stream')

      const decoder = new TextDecoder()
      this.setStatus('streaming')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        this.buffer += decoder.decode(value, { stream: true })
        const lines = this.buffer.split('\n')
        this.buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const event = JSON.parse(trimmed) as AgentScopeEvent
            this.messageHandlers.forEach(h => h(event))
          } catch {
            // skip malformed lines
          }
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
    // NDJSON is unidirectional for this use case
    console.warn('NDJSONAdapter: send() is not supported')
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
