import type { Message, Conversation, ContentBlock } from '@/events/types'
import type { ProtocolType } from '@/protocols/types'

export interface APIConfig {
  baseUrl: string
  protocol: ProtocolType
  agentId: string
  userId: string
  channel: string
}

export interface SendMessageParams {
  conversationId: string
  text: string
  files?: File[]
}

export interface ConversationListItem {
  id: string
  title: string
  messageCount: number
  created_at: string
  updated_at: string
}
