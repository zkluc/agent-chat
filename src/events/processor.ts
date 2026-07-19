import { ref, reactive } from 'vue'
import type { AgentScopeEvent, AgentEventType, ContentBlock, BlockState, GenUISchema } from './types'
import { detectGenUI } from '@/utils/genui'

interface StreamBlockState {
  id: string
  type: string
  content: string
  streaming: boolean
  complete: boolean
  meta?: Record<string, unknown>
}

export interface CompletedToolCall {
  id: string
  name: string
  input: string
}

export class StreamProcessor {
  private blocks = reactive<Map<string, StreamBlockState>>(new Map())
  private blockOrder = ref<string[]>([])
  private currentReplyId = ref<string | null>(null)
  private _isStreaming = ref(false)
  private _error = ref<string | null>(null)
  private _finishedWithToolCalls = ref(false)

  get isStreaming() {
    return this._isStreaming
  }
  get error() {
    return this._error
  }
  get blockStates() {
    return this.blocks
  }
  get orderedBlocks() {
    return this.blockOrder
  }
  get finishedWithToolCalls() {
    return this._finishedWithToolCalls
  }

  reset() {
    this.blocks.clear()
    this.blockOrder.value = []
    this.currentReplyId.value = null
    this._isStreaming.value = false
    this._error.value = null
    this._finishedWithToolCalls.value = false
  }

  handleEvent(event: AgentScopeEvent) {
    switch (event.type) {
      case 'reply_start':
        this.currentReplyId.value = event.reply_id
        this._isStreaming.value = true
        this._error.value = null
        break

      case 'reply_end':
        this._isStreaming.value = false
        this.markAllComplete()
        break

      case 'text_block_start':
        this.addBlock(event.block_id, 'text')
        break

      case 'text_block_delta':
        this.appendToBlock(event.block_id, event.delta)
        this.checkGenUIDetection(event.block_id)
        break

      case 'text_block_end':
        this.checkGenUIDetection(event.block_id)
        this.completeBlock(event.block_id)
        break

      case 'thinking_block_start':
        this.addBlock(event.block_id, 'thinking')
        break

      case 'thinking_block_delta':
        this.appendToBlock(event.block_id, event.delta)
        break

      case 'thinking_block_end':
        this.completeBlock(event.block_id)
        break

      case 'data_block_start':
        this.addBlock(event.block_id, 'data', { media_type: event.media_type })
        break

      case 'data_block_delta':
        this.appendToBlock(event.block_id, event.data, { media_type: event.media_type })
        break

      case 'data_block_end':
        this.completeBlock(event.block_id)
        break

      case 'tool_call_start':
        this.addBlock(event.tool_call_id, 'tool_call', { name: event.tool_call_name, input: '' })
        break

      case 'tool_call_delta': {
        const block = this.blocks.get(event.tool_call_id)
        if (block) {
          const currentInput = (block.meta?.input as string) || ''
          block.meta = { ...block.meta, input: currentInput + event.delta }
        }
        break
      }

      case 'tool_call_end':
        this.completeBlock(event.tool_call_id)
        break

      case 'tool_result_start':
        this.addBlock(event.tool_call_id, 'tool_result', { name: event.tool_call_name, output: '' })
        break

      case 'tool_result_text_delta': {
        const resultBlock = this.blocks.get(event.tool_call_id)
        if (resultBlock) {
          const currentOutput = (resultBlock.meta?.output as string) || ''
          resultBlock.meta = { ...resultBlock.meta, output: currentOutput + event.delta }
          resultBlock.content = resultBlock.meta.output as string
        }
        break
      }

      case 'tool_result_data_delta':
        // Handle binary data in tool results
        break

      case 'tool_result_end': {
        const endBlock = this.blocks.get(event.tool_call_id)
        if (endBlock) {
          endBlock.meta = { ...endBlock.meta, resultState: event.state }
        }
        this.completeBlock(event.tool_call_id)
        break
      }

      case 'model_call_start':
        this.addBlock(`model_${Date.now()}`, 'model_call', { model_name: event.model_name })
        break

      case 'model_call_end':
        // Mark latest model_call block complete
        break

      case 'require_user_confirm':
        this._isStreaming.value = false
        break

      case 'hint_block':
        this.addBlock(event.block_id, 'hint', { hint: event.hint, source: event.source })
        this.completeBlock(event.block_id)
        break

      case 'custom':
        if (event.name === 'tool_calls_finish') {
          this._finishedWithToolCalls.value = true
        } else {
          this.addBlock(`custom_${Date.now()}`, 'custom', { name: event.name, value: event.value })
        }
        break

      default:
        break
    }
  }

  private addBlock(id: string, type: string, meta?: Record<string, unknown>) {
    if (this.blocks.has(id)) return
    this.blocks.set(id, {
      id,
      type,
      content: '',
      streaming: true,
      complete: false,
      meta,
    })
    this.blockOrder.value.push(id)
  }

  private appendToBlock(id: string, content: string, meta?: Record<string, unknown>) {
    const block = this.blocks.get(id)
    if (block) {
      block.content += content
      if (meta) {
        block.meta = { ...block.meta, ...meta }
      }
    } else {
      this.addBlock(id, 'text')
      this.blocks.get(id)!.content = content
    }
  }

  private completeBlock(id: string) {
    const block = this.blocks.get(id)
    if (block) {
      block.streaming = false
      block.complete = true
    }
  }

  private markAllComplete() {
    this.blocks.forEach(block => {
      block.streaming = false
      block.complete = true
    })
  }

  private checkGenUIDetection(blockId: string) {
    const block = this.blocks.get(blockId)
    if (!block) return

    // Already detected as genui - try to parse updated JSON
    if (block.type === 'genui') {
      const result = detectGenUI(block.content)
      if (result.detected && result.schema) {
        block.meta = { ...block.meta, schema: result.schema, message: result.message }
      }
      return
    }

    if (block.type !== 'text') return

    // First detection: as soon as componentName appears, switch to genui
    const result = detectGenUI(block.content)
    if (result.detected) {
      block.type = 'genui'
      block.meta = {
        ...block.meta,
        schema: result.schema,
        message: result.message,
        genuiDetected: true,
        rawContent: block.content,
      }
    }
  }

  getOrderedBlockStates(): StreamBlockState[] {
    return this.blockOrder.value
      .map(id => this.blocks.get(id))
      .filter((b): b is StreamBlockState => b !== undefined)
  }

  getCompletedToolCalls(): CompletedToolCall[] {
    const results: CompletedToolCall[] = []
    for (const block of this.blocks.values()) {
      if (block.type === 'tool_call' && block.complete) {
        const executed = block.meta?.executed as boolean
        if (!executed) {
          results.push({
            id: block.id,
            name: (block.meta?.name as string) || '',
            input: (block.meta?.input as string) || '',
          })
        }
      }
    }
    return results
  }

  markToolCallExecuted(blockId: string) {
    const block = this.blocks.get(blockId)
    if (block) {
      block.meta = { ...block.meta, executed: true }
    }
  }

  updateToolCallState(blockId: string, state: string, result?: string) {
    const block = this.blocks.get(blockId)
    if (block) {
      block.meta = { ...block.meta, toolState: state, toolResult: result }
    }
  }

  addToolResultBlock(toolCallId: string, name: string, output: string, state: string) {
    const id = `tr_${toolCallId}`
    if (this.blocks.has(id)) return
    this.blocks.set(id, {
      id,
      type: 'tool_result',
      content: output,
      streaming: false,
      complete: true,
      meta: { name, output, resultState: state },
    })
    this.blockOrder.value.push(id)
  }

  setFinishedWithToolCalls(value: boolean) {
    this._finishedWithToolCalls.value = value
  }
}
