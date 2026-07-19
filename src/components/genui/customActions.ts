import { ElMessage } from 'element-plus'
import type { ICustomActionItem } from '@opentiny/genui-sdk-vue'

export const customActions: ICustomActionItem[] = [
  {
    name: 'submitForm',
    description: '提交表单数据，将表单中的所有字段值发送给用户确认',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '表单标题或提示信息',
        },
      },
    },
    execute: (params: Record<string, unknown>, context: Record<string, unknown>) => {
      const state = context.state as Record<string, unknown> | undefined
      const formData = state || {}
      const summary = Object.entries(formData)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('\n')
      const title = (params.title as string) || '表单提交'
      if (summary) {
        ElMessage.success(`${title}：数据已收集`)
      } else {
        ElMessage.info(`${title}：无数据`)
      }
    },
  },
  {
    name: 'openPage',
    description: '打开新页面或跳转到指定URL',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要打开的页面地址',
        },
        target: {
          type: 'string',
          description: '打开方式：_self（当前窗口）、_blank（新窗口）',
        },
      },
      required: ['url'],
    },
    execute: (params: Record<string, unknown>) => {
      const url = params.url as string
      const target = (params.target as string) || '_self'
      window.open(url, target)
    },
  },
  {
    name: 'showNotification',
    description: '显示通知消息',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '通知标题',
        },
        message: {
          type: 'string',
          description: '通知内容',
        },
        type: {
          type: 'string',
          description: '通知类型：success、warning、info、error',
        },
      },
      required: ['message'],
    },
    execute: (params: Record<string, unknown>) => {
      const message = (params.message as string) || ''
      const type = (params.type as 'success' | 'warning' | 'info' | 'error') || 'info'
      ElMessage[type](message)
    },
  },
]

export const customActionsMap: Record<string, { execute: (params: any, context: any) => void }> = {}
for (const action of customActions) {
  customActionsMap[action.name] = { execute: action.execute }
}
