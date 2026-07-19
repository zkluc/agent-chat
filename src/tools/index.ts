export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, unknown>
      required?: string[]
    }
  }
}

export interface ToolCallExecution {
  tool_call_id: string
  name: string
  arguments: string
  result: string
  state: 'running' | 'success' | 'error'
  error?: string
}

// ── Tool Definitions (OpenAI function calling format) ──

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_current_weather',
      description: '获取指定城市的当前天气信息',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: '城市名称，如 "北京"、"上海"、"New York"' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: '温度单位' },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: '执行数学计算，支持基本运算和常用数学函数',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: '数学表达式，如 "2 + 3 * 4"、"sqrt(144)"' },
        },
        required: ['expression'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge',
      description: '搜索知识库获取相关信息',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
          limit: { type: 'number', description: '返回结果数量上限，默认5' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_qrcode',
      description: '生成二维码图片',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: '二维码内容（URL或文本）' },
          size: { type: 'number', description: '图片大小（像素），默认256' },
        },
        required: ['content'],
      },
    },
  },
]

// ── Tool Executor ──

export async function executeTool(name: string, args: string): Promise<string> {
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(args)
  } catch {
    return JSON.stringify({ error: `Failed to parse arguments: ${args}` })
  }

  try {
    switch (name) {
      case 'get_current_weather':
        return executeGetWeather(parsed)
      case 'calculate':
        return executeCalculate(parsed)
      case 'search_knowledge':
        return executeSearchKnowledge(parsed)
      case 'generate_qrcode':
        return executeGenerateQRCode(parsed)
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` })
    }
  } catch (err) {
    return JSON.stringify({ error: `Tool execution failed: ${(err as Error).message}` })
  }
}

// ── Individual Tool Implementations ──

async function executeGetWeather(args: Record<string, unknown>): Promise<string> {
  const location = args.location as string || '未知'
  const unit = (args.unit as string) || 'celsius'

  // Simulated weather data — replace with real API call
  const weatherData: Record<string, { temp: number; condition: string; humidity: number; wind: string }> = {
    '北京': { temp: 22, condition: '晴', humidity: 35, wind: '北风3级' },
    '上海': { temp: 26, condition: '多云', humidity: 72, wind: '东南风2级' },
    '广州': { temp: 30, condition: '阵雨', humidity: 85, wind: '南风2级' },
    '深圳': { temp: 29, condition: '多云', humidity: 80, wind: '南风3级' },
    'New York': { temp: 18, condition: 'Sunny', humidity: 45, wind: 'NW 10mph' },
  }

  const data = weatherData[location] || {
    temp: Math.round(15 + Math.random() * 20),
    condition: ['晴', '多云', '阴', '小雨'][Math.floor(Math.random() * 4)],
    humidity: Math.round(30 + Math.random() * 60),
    wind: '微风',
  }

  return JSON.stringify({
    location,
    temperature: unit === 'fahrenheit' ? Math.round(data.temp * 9 / 5 + 32) : data.temp,
    unit,
    condition: data.condition,
    humidity: `${data.humidity}%`,
    wind: data.wind,
    updated_at: new Date().toISOString(),
  })
}

function executeCalculate(args: Record<string, unknown>): string {
  const expression = args.expression as string
  if (!expression) {
    return JSON.stringify({ error: 'No expression provided' })
  }

  // Safe math evaluation — only allow numbers and basic operators
  const sanitized = expression.replace(/[^0-9+\-*/().%\s,]/g, '')
  if (sanitized !== expression) {
    return JSON.stringify({ error: 'Expression contains invalid characters' })
  }

  try {
    // Use Function constructor for safe eval (only math allowed)
    const fn = new Function(`"use strict"; return (${sanitized})`)
    const result = fn()
    return JSON.stringify({
      expression,
      result,
      type: typeof result,
    })
  } catch (err) {
    return JSON.stringify({ error: `Calculation error: ${(err as Error).message}` })
  }
}

async function executeSearchKnowledge(args: Record<string, unknown>): Promise<string> {
  const query = args.query as string
  const limit = (args.limit as number) || 5

  // Simulated knowledge base search — replace with real search API
  const mockResults = [
    { title: `${query} - 概述`, content: `关于"${query}"的详细介绍和背景知识...`, relevance: 0.95 },
    { title: `${query} - 最新进展`, content: `${query}领域的最新研究和发展动态...`, relevance: 0.88 },
    { title: `${query} - 应用场景`, content: `${query}在实际中的应用案例和最佳实践...`, relevance: 0.82 },
  ]

  return JSON.stringify({
    query,
    results: mockResults.slice(0, limit),
    total: mockResults.length,
  })
}

async function executeGenerateQRCode(args: Record<string, unknown>): Promise<string> {
  const content = args.content as string
  const size = (args.size as number) || 256

  // Generate a simple SVG QR code placeholder — replace with real QR library
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="white"/>
    <rect x="10" y="10" width="60" height="60" fill="black"/>
    <rect x="20" y="20" width="40" height="40" fill="white"/>
    <rect x="30" y="30" width="20" height="20" fill="black"/>
    <rect x="${size - 70}" y="10" width="60" height="60" fill="black"/>
    <rect x="${size - 60}" y="20" width="40" height="40" fill="white"/>
    <rect x="${size - 50}" y="30" width="20" height="20" fill="black"/>
    <rect x="10" y="${size - 70}" width="60" height="60" fill="black"/>
    <rect x="20" y="${size - 60}" width="40" height="40" fill="white"/>
    <rect x="30" y="${size - 50}" width="20" height="20" fill="black"/>
    <text x="${size / 2}" y="${size - 10}" text-anchor="middle" font-size="12" fill="black">${content.substring(0, 30)}</text>
  </svg>`

  return JSON.stringify({
    content,
    size,
    format: 'svg',
    data: `data:image/svg+xml;base64,${btoa(svgContent)}`,
  })
}

// ── Helper: Build OpenAI messages for tool calls ──

export interface ToolCallMessage {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolResultMessage {
  role: 'tool'
  tool_call_id: string
  content: string
}

export function buildAssistantToolCallMessage(
  toolCalls: { id: string; name: string; arguments: string }[]
): { role: 'assistant'; tool_calls: ToolCallMessage[] } {
  return {
    role: 'assistant',
    tool_calls: toolCalls.map(tc => ({
      id: tc.id,
      type: 'function' as const,
      function: {
        name: tc.name,
        arguments: tc.arguments,
      },
    })),
  }
}

export function buildToolResultMessages(
  results: { tool_call_id: string; content: string }[]
): ToolResultMessage[] {
  return results.map(r => ({
    role: 'tool' as const,
    tool_call_id: r.tool_call_id,
    content: r.content,
  }))
}
