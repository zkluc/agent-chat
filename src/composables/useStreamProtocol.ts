import { ref, onUnmounted } from 'vue'
import { createStreamProtocol, type StreamProtocol, type StreamStatus } from '@/protocols'
import type { AgentScopeEvent } from '@/events/types'
import { useConversationStore } from '@/stores/conversation'
import { useSettingsStore } from '@/stores/settings'
import {
  TOOL_DEFINITIONS,
  executeTool,
  buildAssistantToolCallMessage,
  buildToolResultMessages,
} from '@/tools'
import { customActions } from '@/components/genui/customActions'

const GENUI_SYSTEM_PROMPT = `你是一个智能助手，可以生成交互式 UI 界面。

当用户请求创建表单、问卷、表格、仪表盘等界面时，使用以下 JSON 格式输出（放在 \`\`\`genui 代码块中）：

\`\`\`genui
{
  "componentName": "Page",
  "state": { "字段名": "初始值" },
  "children": [子组件数组]
}
\`\`\`

【Schema 协议规范】
根节点必须使用 "componentName": "Page"，支持以下字段：
- state: 全局状态对象，组件可通过 this.state.xxx 访问
- methods: 方法集合，定义可复用的函数
- css: 全局 CSS 样式字符串
- children: 子组件数组

【属性值类型】
- 静态值: 直接写字符串、数字、布尔值
- JS 表达式: { "type": "JSExpression", "value": "this.state.xxx" }
- 双向绑定: { "type": "JSExpression", "value": "this.state.xxx", "model": true }
- JS 函数: { "type": "JSFunction", "value": "function() { ... }" }

【组件名列表】
- 布局: CanvasFlexBox(flex布局), div, Page(根节点)
- 表单: TinyForm, TinyFormItem, TinyInput, TinySelect, TinyOption, TinySwitch, TinyRadio, TinyCheckbox, TinyDatePicker, TinyTimePicker, TinyNumeric, TinyRate, TinySlider, TinyColorPicker, TinyUpload, TinyButton
- 展示: TinyTable, TinyTableColumn, TinyAvatar, TinyTag, TinyProgress, TinyBadge, TinyDescriptions, TinyDescriptionsItem, TinyTimeline, TinyTimelineItem, TinySteps, TinyStep
- 导航: TinyTabs, TinyTabItem
- 反馈: TinyAlert, TinyDialog, TinyDrawer
- 其他: Text(文本), img(图片), TinyCard, TinyCollapse, TinyCollapseItem, TinyDivider, TinyImage, TinyLink, TinySpace, TinyRow, TinyCol

【props 规则】
- 表单输入组件必须使用双向绑定: "value": { "type": "JSExpression", "value": "this.state.fieldName", "model": true }
- 事件处理使用 methods + JSExpression 或直接 JSFunction
- CanvasFlexBox 支持 flexDirection, justifyContent, alignItems, gap 等属性

【示例：登录表单】
\`\`\`genui
{
  "componentName": "Page",
  "state": { "username": "", "password": "" },
  "methods": {
    "handleLogin": {
      "type": "JSFunction",
      "value": "function() { alert('用户名: ' + this.state.username) }"
    }
  },
  "children": [
    {
      "componentName": "CanvasFlexBox",
      "props": { "flexDirection": "column", "gap": "12px", "padding": "16px" },
      "children": [
        { "componentName": "Text", "props": { "text": "用户登录", "style": "font-size:20px;font-weight:bold" } },
        {
          "componentName": "TinyForm",
          "props": { "labelWidth": "80px" },
          "children": [
            {
              "componentName": "TinyFormItem",
              "props": { "label": "用户名" },
              "children": [
                { "componentName": "TinyInput", "props": { "value": { "type": "JSExpression", "value": "this.state.username", "model": true }, "placeholder": "请输入用户名" } }
              ]
            },
            {
              "componentName": "TinyFormItem",
              "props": { "label": "密码" },
              "children": [
                { "componentName": "TinyInput", "props": { "value": { "type": "JSExpression", "value": "this.state.password", "model": true }, "type": "password", "placeholder": "请输入密码" } }
              ]
            },
            {
              "componentName": "TinyButton",
              "props": { "text": "登录", "type": "primary", "onClick": { "type": "JSExpression", "value": "this.handleLogin" } }
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

【示例：数据表格】
\`\`\`genui
{
  "componentName": "Page",
  "state": {
    "users": [
      { "name": "张三", "age": 28 },
      { "name": "李四", "age": 32 }
    ]
  },
  "children": [
    {
      "componentName": "TinyTable",
      "props": { "data": { "type": "JSExpression", "value": "this.state.users" } },
      "children": [
        { "componentName": "TinyTableColumn", "props": { "prop": "name", "label": "姓名" } },
        { "componentName": "TinyTableColumn", "props": { "prop": "age", "label": "年龄" } }
      ]
    }
  ]
}
\`\`\`

请严格按照上述格式输出。如果用户只是普通对话，正常回复即可，不要输出 genui 代码块。`

export function useStreamProtocol() {
  const store = useConversationStore()
  const settings = useSettingsStore()

  let protocol: StreamProtocol | null = null
  const status = ref<StreamStatus>('idle')
  let conversationHistory: { role: string; content?: string; tool_calls?: unknown[]; tool_call_id?: string }[] = []
  let agenticLoopActive = false

  const cleanups: (() => void)[] = []

  function handleAgentEvent(event: AgentScopeEvent) {
    store.handleStreamEvent(event)
  }

  function attachProtocolHandlers(p: StreamProtocol) {
    cleanups.push(
      p.onStatusChange((s) => { status.value = s }),
      p.onMessage((event) => { handleAgentEvent(event) }),
      p.onError((err) => { console.error('Stream error:', err) }),
    )
  }

  function sendMessage(text: string) {
    // Build conversation history for OpenAI format
    conversationHistory = []

    // Add system prompt for GenUI + tool support
    const systemContent = GENUI_SYSTEM_PROMPT + `\n\n你可以使用以下工具：\n${TOOL_DEFINITIONS.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n')}`
    conversationHistory.push({ role: 'system', content: systemContent })

    // Add previous messages (text only for now)
    for (const msg of store.messages) {
      if (msg.role === 'user') {
        const textContent = msg.content
          .filter(b => b.type === 'text')
          .map(b => (b as { type: 'text'; text: string }).text)
          .join('\n')
        if (textContent) {
          conversationHistory.push({ role: 'user', content: textContent })
        }
      }
      // Assistant messages will be handled by the agentic loop
    }

    // Add current user message
    conversationHistory.push({ role: 'user', content: text })

    store.addUserMessage(text)
    store.startAssistantMessage()
    store.resetStream()

    startStream()
  }

  function startStream() {
    disconnect()

    protocol = createStreamProtocol(settings.protocol)
    attachProtocolHandlers(protocol)

    protocol.onMessage((event) => {
      // After stream ends, check if we need to run agentic loop
      if (event.type === 'reply_end') {
        checkAndRunAgenticLoop()
      }
    })

    const body = {
      model: settings.model,
      messages: conversationHistory,
      stream: true,
      tools: TOOL_DEFINITIONS,
      tool_choice: 'auto',
      metadata: {
        tinygenui: JSON.stringify({
          customActions: customActions.map(({ execute: _execute, ...rest }) => rest),
        }),
      },
    }

    protocol.connect(settings.getApiUrl(), {
      headers: settings.getHeaders(),
      body,
      reconnect: false,
    })
  }

  function checkAndRunAgenticLoop() {
    // Wait a tick for the processor to finish updating
    setTimeout(async () => {
      const completedTools = store.streamProcessor.getCompletedToolCalls()

      if (completedTools.length === 0) {
        agenticLoopActive = false
        return
      }

      agenticLoopActive = true

      // 1. Build assistant message with tool_calls
      const assistantToolCalls = completedTools.map(tc => ({
        id: tc.id,
        name: tc.name,
        arguments: tc.input,
      }))

      conversationHistory.push(buildAssistantToolCallMessage(assistantToolCalls))

      // 2. Mark all as running, then execute all tools concurrently
      const results: { tool_call_id: string; content: string }[] = []

      for (const tc of completedTools) {
        store.updateToolCallState(tc.id, 'running')
        store.streamProcessor.markToolCallExecuted(tc.id)
      }

      const execResults = await Promise.allSettled(
        completedTools.map(async (tc) => {
          const result = await executeTool(tc.name, tc.input)
          return { id: tc.id, name: tc.name, result }
        })
      )

      for (let i = 0; i < completedTools.length; i++) {
        const tc = completedTools[i]
        const execResult = execResults[i]
        if (execResult.status === 'fulfilled') {
          store.updateToolCallState(tc.id, 'finished', execResult.value.result)
          store.addToolResultBlock(tc.id, tc.name, execResult.value.result, 'success')
          results.push({ tool_call_id: tc.id, content: execResult.value.result })
        } else {
          const errorMsg = JSON.stringify({ error: execResult.reason?.message || 'Unknown error' })
          store.updateToolCallState(tc.id, 'finished', errorMsg)
          store.addToolResultBlock(tc.id, tc.name, errorMsg, 'error')
          results.push({ tool_call_id: tc.id, content: errorMsg })
        }
      }

      // 3. Add tool results to conversation history
      conversationHistory.push(...buildToolResultMessages(results))

      // 4. Continue streaming — model will generate final response based on tool results
      store.startAssistantMessage()
      store.streamProcessor.reset()
      store.streamProcessor.setFinishedWithToolCalls(false)

      startStream()
    }, 100)
  }

  function disconnect() {
    protocol?.close()
    cleanups.forEach(fn => fn())
    cleanups.length = 0
    protocol = null
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    status,
    disconnect,
    sendMessage,
  }
}
