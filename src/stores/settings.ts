import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ProtocolType } from '@/protocols/types'

export const useSettingsStore = defineStore('settings', () => {
  const protocol = ref<ProtocolType>('sse')
  const baseUrl = ref('')
  const apiPath = ref('/v1/chat/completions')
  const apiKey = ref('sk-xztKzIy0yCTjHEBWS4n0PebLqAFbE5CKQabKPPL7lrxve30K')
  const model = ref('agnes-2.0-flash')
  const userId = ref('user-001')
  const channel = ref('console')
  const theme = ref<'light' | 'dark'>('light')

  function getApiUrl(): string {
    return `${baseUrl.value}${apiPath.value}`
  }

  function getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${apiKey.value}`,
    }
  }

  return {
    protocol,
    baseUrl,
    apiPath,
    apiKey,
    model,
    userId,
    channel,
    theme,
    getApiUrl,
    getHeaders,
  }
})
