export type ToolCallState = 'pending' | 'asking' | 'allowed' | 'submitted' | 'finished'
export type ToolResultState = 'running' | 'success' | 'error' | 'interrupted' | 'denied'

export interface TextBlock {
  type: 'text'
  id: string
  text: string
}

export interface ThinkingBlock {
  type: 'thinking'
  id: string
  thinking: string
}

export interface DataBlock {
  type: 'data'
  id: string
  source: Base64Source | URLSource
  name?: string
}

export interface Base64Source {
  type: 'base64'
  data: string
  media_type: string
}

export interface URLSource {
  type: 'url'
  url: string
  media_type: string
}

export interface ToolCallBlock {
  type: 'tool_call'
  id: string
  name: string
  input: string
  state: ToolCallState
}

export interface ToolResultBlock {
  type: 'tool_result'
  id: string
  name: string
  output: string | (TextBlock | DataBlock)[]
  state: ToolResultState
}

export interface HintBlock {
  type: 'hint'
  id: string
  hint: string | (TextBlock | DataBlock)[]
  source?: string
}

export interface GenUIBlock {
  type: 'genui'
  id: string
  schema: GenUISchema
  message?: string
  streaming: boolean
}

export interface GenUISchema {
  componentName: string
  props?: Record<string, unknown>
  children?: (GenUISchema | string)[]
  [key: string]: unknown
}

export type ContentBlock = TextBlock | ThinkingBlock | DataBlock | ToolCallBlock | ToolResultBlock | HintBlock | GenUIBlock

export interface Message {
  id: string
  name: string
  role: 'user' | 'assistant' | 'system'
  content: ContentBlock[]
  metadata?: Record<string, unknown>
  created_at: string
  finished_at?: string
  usage?: { input_tokens: number; output_tokens: number }
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  created_at: string
  updated_at: string
  agent_id?: string
  session_id?: string
}

export type BlockType = ContentBlock['type']

// AgentScope 2.0 Event Types
export enum AgentEventType {
  REPLY_START = 'reply_start',
  REPLY_END = 'reply_end',
  TEXT_BLOCK_START = 'text_block_start',
  TEXT_BLOCK_DELTA = 'text_block_delta',
  TEXT_BLOCK_END = 'text_block_end',
  THINKING_BLOCK_START = 'thinking_block_start',
  THINKING_BLOCK_DELTA = 'thinking_block_delta',
  THINKING_BLOCK_END = 'thinking_block_end',
  DATA_BLOCK_START = 'data_block_start',
  DATA_BLOCK_DELTA = 'data_block_delta',
  DATA_BLOCK_END = 'data_block_end',
  TOOL_CALL_START = 'tool_call_start',
  TOOL_CALL_DELTA = 'tool_call_delta',
  TOOL_CALL_END = 'tool_call_end',
  TOOL_RESULT_START = 'tool_result_start',
  TOOL_RESULT_TEXT_DELTA = 'tool_result_text_delta',
  TOOL_RESULT_DATA_DELTA = 'tool_result_data_delta',
  TOOL_RESULT_END = 'tool_result_end',
  MODEL_CALL_START = 'model_call_start',
  MODEL_CALL_END = 'model_call_end',
  REQUIRE_USER_CONFIRM = 'require_user_confirm',
  REQUIRE_EXTERNAL_EXECUTION = 'require_external_execution',
  HINT_BLOCK = 'hint_block',
  CUSTOM = 'custom',
}

export interface EventBase {
  type: AgentEventType
  id: string
  reply_id: string
  created_at: string
}

export interface ReplyStartEvent extends EventBase {
  type: AgentEventType.REPLY_START
  session_id: string
  name: string
  role: string
}

export interface ReplyEndEvent extends EventBase {
  type: AgentEventType.REPLY_END
  session_id: string
}

export interface TextBlockStartEvent extends EventBase {
  type: AgentEventType.TEXT_BLOCK_START
  block_id: string
}

export interface TextBlockDeltaEvent extends EventBase {
  type: AgentEventType.TEXT_BLOCK_DELTA
  block_id: string
  delta: string
}

export interface TextBlockEndEvent extends EventBase {
  type: AgentEventType.TEXT_BLOCK_END
  block_id: string
}

export interface ThinkingBlockStartEvent extends EventBase {
  type: AgentEventType.THINKING_BLOCK_START
  block_id: string
}

export interface ThinkingBlockDeltaEvent extends EventBase {
  type: AgentEventType.THINKING_BLOCK_DELTA
  block_id: string
  delta: string
}

export interface ThinkingBlockEndEvent extends EventBase {
  type: AgentEventType.THINKING_BLOCK_END
  block_id: string
}

export interface DataBlockStartEvent extends EventBase {
  type: AgentEventType.DATA_BLOCK_START
  block_id: string
  media_type: string
}

export interface DataBlockDeltaEvent extends EventBase {
  type: AgentEventType.DATA_BLOCK_DELTA
  block_id: string
  data: string
  media_type: string
}

export interface DataBlockEndEvent extends EventBase {
  type: AgentEventType.DATA_BLOCK_END
  block_id: string
}

export interface ToolCallStartEvent extends EventBase {
  type: AgentEventType.TOOL_CALL_START
  tool_call_id: string
  tool_call_name: string
}

export interface ToolCallDeltaEvent extends EventBase {
  type: AgentEventType.TOOL_CALL_DELTA
  tool_call_id: string
  delta: string
}

export interface ToolCallEndEvent extends EventBase {
  type: AgentEventType.TOOL_CALL_END
  tool_call_id: string
}

export interface ToolResultStartEvent extends EventBase {
  type: AgentEventType.TOOL_RESULT_START
  tool_call_id: string
  tool_call_name: string
}

export interface ToolResultTextDeltaEvent extends EventBase {
  type: AgentEventType.TOOL_RESULT_TEXT_DELTA
  tool_call_id: string
  delta: string
}

export interface ToolResultDataDeltaEvent extends EventBase {
  type: AgentEventType.TOOL_RESULT_DATA_DELTA
  tool_call_id: string
  block_id: string
  media_type: string
  data?: string
  url?: string
}

export interface ToolResultEndEvent extends EventBase {
  type: AgentEventType.TOOL_RESULT_END
  tool_call_id: string
  state: ToolResultState
}

export interface ModelCallStartEvent extends EventBase {
  type: AgentEventType.MODEL_CALL_START
  model_name: string
}

export interface ModelCallEndEvent extends EventBase {
  type: AgentEventType.MODEL_CALL_END
  input_tokens: number
  output_tokens: number
}

export interface RequireUserConfirmEvent extends EventBase {
  type: AgentEventType.REQUIRE_USER_CONFIRM
  tool_calls: ToolCallBlock[]
}

export interface HintBlockEvent extends EventBase {
  type: AgentEventType.HINT_BLOCK
  block_id: string
  hint: string | (TextBlock | DataBlock)[]
  source?: string
}

export interface CustomEvent extends EventBase {
  type: AgentEventType.CUSTOM
  name: string
  value: Record<string, unknown>
}

export type AgentScopeEvent =
  | ReplyStartEvent
  | ReplyEndEvent
  | TextBlockStartEvent
  | TextBlockDeltaEvent
  | TextBlockEndEvent
  | ThinkingBlockStartEvent
  | ThinkingBlockDeltaEvent
  | ThinkingBlockEndEvent
  | DataBlockStartEvent
  | DataBlockDeltaEvent
  | DataBlockEndEvent
  | ToolCallStartEvent
  | ToolCallDeltaEvent
  | ToolCallEndEvent
  | ToolResultStartEvent
  | ToolResultTextDeltaEvent
  | ToolResultDataDeltaEvent
  | ToolResultEndEvent
  | ModelCallStartEvent
  | ModelCallEndEvent
  | RequireUserConfirmEvent
  | HintBlockEvent
  | CustomEvent

// Block state for UI rendering
export interface BlockState {
  id: string
  type: BlockType
  content: string
  streaming: boolean
  complete: boolean
  meta?: Record<string, unknown>
}
