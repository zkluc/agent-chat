import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Message, Conversation, ContentBlock, BlockState } from '@/events/types'
import { StreamProcessor } from '@/events/processor'
import { saveToCache, loadFromCache, clearCache } from './cache'

const CACHE_CONVERSATIONS_KEY = 'agent_chat_conversations'
const CACHE_ACTIVE_ID_KEY = 'agent_chat_active_id'

let msgIdCounter = 0
function genMsgId(): string {
  return `msg_${Date.now()}_${++msgIdCounter}`
}

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversation[]>([])
  const activeConversationId = ref<string | null>(null)
  let streamProcessor = new StreamProcessor()

  function persist() {
    saveToCache(JSON.stringify(conversations.value))
    try {
      localStorage.setItem(CACHE_ACTIVE_ID_KEY, activeConversationId.value || '')
    } catch {}
  }

  function loadFromStorage() {
    try {
      const data = loadFromCache()
      if (data) {
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed)) {
          conversations.value = parsed
        }
      }
      const activeId = localStorage.getItem(CACHE_ACTIVE_ID_KEY)
      if (activeId && conversations.value.some(c => c.id === activeId)) {
        activeConversationId.value = activeId
      }
    } catch {}
  }

  loadFromStorage()

  const activeConversation = computed(() =>
    conversations.value.find(c => c.id === activeConversationId.value)
  )

  const messages = computed(() => activeConversation.value?.messages || [])

  const isStreaming = computed(() => streamProcessor.isStreaming.value)
  const currentBlocks = computed(() => streamProcessor.getOrderedBlockStates())
  const streamError = computed(() => streamProcessor.error.value)
  const finishedWithToolCalls = computed(() => streamProcessor.finishedWithToolCalls.value)

  function createConversation(title?: string): string {
    const id = `conv_${Date.now()}`
    const now = new Date().toISOString()
    conversations.value.unshift({
      id,
      title: title || `对话 ${conversations.value.length + 1}`,
      messages: [],
      created_at: now,
      updated_at: now,
    })
    activeConversationId.value = id
    persist()
    return id
  }

  function setActiveConversation(id: string) {
    activeConversationId.value = id
    persist()
  }

  function addUserMessage(text: string) {
    if (!activeConversation.value) createConversation()

    const msg: Message = {
      id: genMsgId(),
      name: 'User',
      role: 'user',
      content: [{ type: 'text', id: `txt_${Date.now()}`, text }],
      created_at: new Date().toISOString(),
    }
    activeConversation.value!.messages.push(msg)
    activeConversation.value!.updated_at = msg.created_at
    persist()
    return msg
  }

  function startAssistantMessage(): Message {
    if (!activeConversation.value) createConversation()

    const msg: Message = {
      id: genMsgId(),
      name: 'Agent',
      role: 'assistant',
      content: [],
      created_at: new Date().toISOString(),
    }
    activeConversation.value!.messages.push(msg)
    activeConversation.value!.updated_at = msg.created_at
    persist()
    return msg
  }

  function getAssistantMessage(): Message | undefined {
    const conv = activeConversation.value
    if (!conv) return undefined
    const msgs = conv.messages.filter(m => m.role === 'assistant')
    return msgs[msgs.length - 1]
  }

  function handleStreamEvent(event: import('@/events/types').AgentScopeEvent) {
    streamProcessor.handleEvent(event)
    syncBlocksToMessage()
  }

  function syncBlocksToMessage() {
    const assistantMsg = getAssistantMessage()
    if (!assistantMsg) return

    // Sync blocks from processor to message content
    const blocks = streamProcessor.getOrderedBlockStates()
    assistantMsg.content = blocks.map(b => {
      switch (b.type) {
        case 'genui':
          return {
            type: 'genui' as const,
            id: b.id,
            schema: b.meta?.schema as import('@/events/types').GenUISchema,
            message: b.meta?.message as string,
            streaming: b.streaming,
          }
        case 'text':
          return { type: 'text' as const, id: b.id, text: b.content }
        case 'thinking':
          return { type: 'thinking' as const, id: b.id, thinking: b.content }
        case 'data':
          return {
            type: 'data' as const,
            id: b.id,
            source: { type: 'url' as const, url: b.content, media_type: (b.meta?.media_type as string) || 'image/png' },
          }
        case 'tool_call':
          return {
            type: 'tool_call' as const,
            id: b.id,
            name: (b.meta?.name as string) || '',
            input: (b.meta?.input as string) || '',
            state: (b.meta?.toolState as any) || (b.complete ? 'finished' as const : 'submitted' as const),
          }
        case 'tool_result':
          return {
            type: 'tool_result' as const,
            id: b.id,
            name: (b.meta?.name as string) || '',
            output: (b.meta?.output as string) || b.content || '',
            state: (b.meta?.resultState as any) || (b.complete ? 'success' as const : 'running' as const),
          }
        case 'hint':
          return {
            type: 'hint' as const,
            id: b.id,
            hint: (b.meta?.hint as string) || b.content,
            source: b.meta?.source as string,
          }
        default:
          return { type: 'text' as const, id: b.id, text: b.content }
      }
    })

    if (activeConversation.value) {
      activeConversation.value.updated_at = new Date().toISOString()
      persist()
    }
  }

  function updateToolCallState(blockId: string, state: string, result?: string) {
    streamProcessor.updateToolCallState(blockId, state, result)
    syncBlocksToMessage()
  }

  function addToolResultBlock(toolCallId: string, name: string, output: string, state: string) {
    streamProcessor.addToolResultBlock(toolCallId, name, output, state)
    syncBlocksToMessage()
  }

  function resetStream() {
    streamProcessor.reset()
  }

  function deleteConversation(id: string) {
    conversations.value = conversations.value.filter(c => c.id !== id)
    if (activeConversationId.value === id) {
      activeConversationId.value = conversations.value[0]?.id || null
    }
    persist()
  }

  function updateConversationTitle(id: string, title: string) {
    const conv = conversations.value.find(c => c.id === id)
    if (conv) conv.title = title
    persist()
  }

  function deleteMessage(msgId: string) {
    if (!activeConversation.value) return
    activeConversation.value.messages = activeConversation.value.messages.filter(m => m.id !== msgId)
    activeConversation.value.updated_at = new Date().toISOString()
    persist()
  }

  function clearMessages() {
    if (activeConversation.value) {
      activeConversation.value.messages = []
      activeConversation.value.updated_at = new Date().toISOString()
      persist()
    }
  }

  function clearAll() {
    conversations.value = []
    activeConversationId.value = null
    clearCache()
    try {
      localStorage.removeItem(CACHE_ACTIVE_ID_KEY)
    } catch {}
  }

  function getCompletedToolCalls() {
    return streamProcessor.getCompletedToolCalls()
  }

  function getOrderedBlockStates() {
    return streamProcessor.getOrderedBlockStates()
  }

  function markToolCallExecuted(blockId: string) {
    streamProcessor.markToolCallExecuted(blockId)
  }

  function setFinishedWithToolCalls(value: boolean) {
    streamProcessor.setFinishedWithToolCalls(value)
  }

  function addToolResultBlockDirect(toolCallId: string, name: string, output: string, state: string) {
    streamProcessor.addToolResultBlock(toolCallId, name, output, state)
  }

  return {
    conversations,
    activeConversationId,
    activeConversation,
    messages,
    isStreaming,
    currentBlocks,
    streamError,
    finishedWithToolCalls,
    createConversation,
    setActiveConversation,
    addUserMessage,
    startAssistantMessage,
    getAssistantMessage,
    handleStreamEvent,
    resetStream,
    deleteConversation,
    updateConversationTitle,
    deleteMessage,
    clearMessages,
    clearAll,
    updateToolCallState,
    addToolResultBlock,
    getCompletedToolCalls,
    getOrderedBlockStates,
    markToolCallExecuted,
    setFinishedWithToolCalls,
    addToolResultBlockDirect,
  }
})
