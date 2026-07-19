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

const GENUI_SYSTEM_PROMPT = `你是一个智能助手，可以生成交互式 UI 界面。

当用户请求创建表单、问卷、表格、仪表盘等界面时，使用以下 JSON 格式输出（放在 \`\`\`genui 代码块中）：

\`\`\`genui
{
  "componentName": "组件名",
  "props": { "属性": "值" },
  "children": [子组件数组]
}
\`\`\`

【组件名列表】
- 容器/布局: ElCard, ElRow, ElCol, ElSpace, ElDivider, Page
- 表单: ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElSwitch, ElDatePicker, ElTimePicker, ElInputNumber, ElRate, ElSlider, ElColorPicker, ElUpload, ElButton
- 展示: ElTable, ElTableColumn, ElAvatar, ElTag, ElProgress, ElBadge, ElDescriptions, ElDescriptionsItem, ElTimeline, ElTimelineItem, ElSteps, ElStep
- 导航: ElTabs, ElTabPane, ElMenu, ElMenuItem
- 反馈: ElAlert, ElDialog, ElDrawer, ElMessage, ElMessageBox
- 其他: ElText(映射为span), ElImage, ElLink, ElCollapse, ElCollapseItem

【props 规则】
- style 使用驼峰命名: fontSize, marginTop, backgroundColor
- children 是数组，可以包含子组件或字符串文本
- 表单输入组件(ElInput, ElSelect, ElSwitch, ElRadioGroup, ElCheckboxGroup, ElDatePicker, ElTimePicker, ElInputNumber, ElRate, ElSlider, ElColorPicker) 必须设置 "model" 属性作为字段名，如 "model": "username"
- ElOption 必须设置 "value" 属性
- ElButton 点击会自动收集表单数据提交，可用 "action" 属性标记操作名称

【示例：登录表单】
\`\`\`genui
{
  "componentName": "ElCard",
  "props": { "shadow": "hover", "header": "用户登录" },
  "children": [
    {
      "componentName": "ElForm",
      "props": { "labelWidth": "80px" },
      "children": [
        {
          "componentName": "ElFormItem",
          "props": { "label": "用户名" },
          "children": [
            { "componentName": "ElInput", "props": { "model": "username", "placeholder": "请输入用户名" } }
          ]
        },
        {
          "componentName": "ElFormItem",
          "props": { "label": "密码" },
          "children": [
            { "componentName": "ElInput", "props": { "model": "password", "type": "password", "placeholder": "请输入密码" } }
          ]
        },
        {
          "componentName": "ElFormItem",
          "props": { "label": "" },
          "children": [
            { "componentName": "ElButton", "props": { "type": "primary", "style": { "width": "100%" } }, "children": ["登录"] }
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
  "componentName": "ElCard",
  "props": { "shadow": "hover" },
  "children": [
    {
      "componentName": "ElTable",
      "props": { "data": [{"name":"张三","age":28},{"name":"李四","age":32}] },
      "children": [
        { "componentName": "ElTableColumn", "props": { "prop": "name", "label": "姓名" } },
        { "componentName": "ElTableColumn", "props": { "prop": "age", "label": "年龄" } }
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
