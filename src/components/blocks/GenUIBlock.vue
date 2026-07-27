<template>
  <div class="genui-block">
    <div v-if="genuiMessage" class="genui-message">{{ genuiMessage }}</div>
    <div class="genui-container">
      <template v-if="genuiSchema">
        <GenUIRenderer :schema="genuiSchema" />
      </template>
      <div v-else class="genui-loading">
        <span class="genui-loading-dot" />
        <span class="genui-loading-dot" />
        <span class="genui-loading-dot" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, provide } from 'vue'
import type { GenUISchema } from '@/events/types'
import GenUIRenderer from './GenUIRenderer.vue'
import { useConversationStore } from '@/stores/conversation'

const GENUI_FORM_DATA = 'genui-form-data'
const GENUI_ON_ACTION = 'genui-on-action'

const props = defineProps<{
  block: {
    id: string
    type: string
    content: string
    streaming: boolean
    complete: boolean
    meta?: Record<string, unknown>
  }
}>()

const genuiSchema = computed<GenUISchema | undefined>(() => {
  return props.block.meta?.schema as GenUISchema | undefined
})

const genuiMessage = computed(() => props.block.meta?.message as string | undefined)

const formData = reactive<Record<string, unknown>>({})
provide(GENUI_FORM_DATA, formData)

const store = useConversationStore()

provide(GENUI_ON_ACTION, (action: string, data: Record<string, unknown>) => {
  const summary = Object.entries(data)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join('\n')
  const text = summary ? `[表单提交]\n${summary}` : `[操作: ${action}]`
  store.addUserMessage(text)
})
</script>

<style lang="less" scoped>
.genui-block {
  border: 1px solid var(--border-color, #EFE7FC);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-primary, #FAF5FF);
}

.genui-message {
  padding: 12px 16px;
  font-size: 14px;
  color: var(--text-primary, #0F172A);
  border-bottom: 1px solid var(--border-color, #EFE7FC);
  background: var(--bg-secondary, #F7F3FD);
}

.genui-container {
  // padding: 0;
  border: none;
  .el-card{
    min-height:0 !important;
    padding:0px !important;
    margin:0px !important;
    height: auto !important;
    background-color: transparent !important;
    border: none;
    width: 100%;
    box-shadow: none;
    :deep(.el-card__body){
      padding:10px;
      border: none;
    }
  }
}

.genui-loading {
  display: flex;
  gap: 6px;
  justify-content: center;
  padding: 24px;
}

.genui-loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary, #7C3AED);
  animation: genui-bounce 1.4s infinite ease-in-out;
}

.genui-loading-dot:nth-child(1) { animation-delay: -0.32s; }
.genui-loading-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes genui-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
</style>
