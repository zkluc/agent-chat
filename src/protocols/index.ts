import type { ProtocolType, StreamProtocol } from './types'
import { SSEAdapter } from './sse'
import { WebSocketAdapter } from './websocket'
import { NDJSONAdapter } from './ndjson'

export function createStreamProtocol(type: ProtocolType): StreamProtocol {
  switch (type) {
    case 'sse':
      return new SSEAdapter()
    case 'websocket':
      return new WebSocketAdapter()
    case 'ndjson':
      return new NDJSONAdapter()
    default:
      return new SSEAdapter()
  }
}

export { SSEAdapter } from './sse'
export { WebSocketAdapter } from './websocket'
export { NDJSONAdapter } from './ndjson'
export type { StreamProtocol, ProtocolType, StreamStatus, ConnectionOptions } from './types'
