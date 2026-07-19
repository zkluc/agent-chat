import type { StreamProtocol, ConnectionOptions, StreamStatus } from './types'
import type { AgentScopeEvent } from '@/events/types'

type Handler<T> = (data: T) => void

export class WebSocketAdapter implements StreamProtocol {
  private _status: StreamStatus = 'idle'
  private ws: WebSocket | null = null
  private messageHandlers = new Set<Handler<AgentScopeEvent>>()
  private errorHandlers = new Set<Handler<Error>>()
  private closeHandlers = new Set<Handler<void>>()
  private statusHandlers = new Set<Handler<StreamStatus>>()
  private reconnectAttempts = 0
  private options: ConnectionOptions = {}
  private url = ''

  get status(): StreamStatus {
    return this._status
  }

  private setStatus(s: StreamStatus) {
    this._status = s
    this.statusHandlers.forEach(h => h(s))
  }

  connect(url: string, options?: ConnectionOptions) {
    this.url = url
    this.options = options || {}
    this.reconnectAttempts = 0
    this.doConnect()
  }

  private doConnect() {
    this.setStatus('connecting')
    const wsUrl = this.url.replace(/^http/, 'ws')

    try {
      this.ws = new WebSocket(wsUrl)
    } catch (err) {
      this.setStatus('error')
      this.errorHandlers.forEach(h => h(err as Error))
      return
    }

    this.ws.onopen = () => {
      this.setStatus('connected')
      this.reconnectAttempts = 0

      if (this.options.body) {
        this.ws!.send(JSON.stringify(this.options.body))
      }
    }

    this.ws.onmessage = (ev) => {
      this.setStatus('streaming')
      try {
        const event = JSON.parse(ev.data) as AgentScopeEvent
        this.messageHandlers.forEach(h => h(event))
      } catch {
        console.warn('WebSocketAdapter: failed to parse message', ev.data)
      }
    }

    this.ws.onerror = (ev) => {
      this.setStatus('error')
      this.errorHandlers.forEach(h => h(new Error('WebSocket error')))
    }

    this.ws.onclose = () => {
      this.setStatus('disconnected')
      this.closeHandlers.forEach(h => h())

      if (this.options.reconnect && this.shouldReconnect()) {
        this.reconnectAttempts++
        const delay = this.options.reconnectInterval || 3000
        setTimeout(() => this.doConnect(), delay)
      }
    }
  }

  private shouldReconnect(): boolean {
    const max = this.options.maxReconnectAttempts || 5
    return this.reconnectAttempts < max
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(typeof data === 'string' ? data : JSON.stringify(data))
    }
  }

  close() {
    this.options.reconnect = false
    this.ws?.close()
    this.ws = null
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
