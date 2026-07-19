<template>
  <component
    :is="resolvedComponent"
    v-if="resolvedComponent"
    v-bind="componentBindings"
  >
    <template v-if="hasChildren">
      <template v-for="(child, idx) in validChildren" :key="idx">
        <GenUIRenderer
          v-if="isSchema(child)"
          :schema="child"
        />
        <span v-else>{{ child }}</span>
      </template>
    </template>
    <template v-else-if="textChildren.length">
      <span v-for="(t, i) in textChildren" :key="i">{{ t }}</span>
    </template>
  </component>
  <div v-else-if="schema.componentName" class="genui-unknown">
    <span>未知组件: {{ schema.componentName }}</span>
  </div>
  <div v-else class="genui-streaming">
    <span class="genui-cursor" />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, type Component } from 'vue'
import type { GenUISchema } from '@/events/types'
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElButton,
  ElTable,
  ElTableColumn,
  ElSelect,
  ElOption,
  ElSwitch,
  ElRadioGroup,
  ElCheckboxGroup,
  ElDatePicker,
  ElTimePicker,
  ElInputNumber,
  ElRate,
  ElSlider,
  ElColorPicker,
  ElUpload,
  ElTag,
  ElCard,
  ElCollapse,
  ElCollapseItem,
  ElTabs,
  ElTabPane,
  ElAlert,
  ElDialog,
  ElDivider,
  ElImage,
  ElLink,
  ElSpace,
  ElRow,
  ElCol,
  ElDescriptions,
  ElDescriptionsItem,
  ElTimeline,
  ElTimelineItem,
  ElSteps,
  ElStep,
  ElProgress,
  ElBadge,
  ElAvatar,
  ElTooltip,
  ElPopover,
  ElDrawer,
  ElResult,
  ElEmpty,
  ElScrollbar,
} from 'element-plus'

const props = defineProps<{
  schema: GenUISchema
}>()

const COMPONENT_MAP: Record<string, Component> = {
  Page: ElCard,
  Text: 'div',
  TinyForm: ElForm,
  TinyFormItem: ElFormItem,
  TinyInput: ElInput,
  TinyButton: ElButton,
  TinySelect: ElSelect,
  TinyOption: ElOption,
  TinySwitch: ElSwitch,
  TinyRadio: ElRadioGroup,
  TinyCheckbox: ElCheckboxGroup,
  TinyDatePicker: ElDatePicker,
  TinyTimePicker: ElTimePicker,
  TinyNumeric: ElInputNumber,
  TinyRate: ElRate,
  TinySlider: ElSlider,
  TinyColorPicker: ElColorPicker,
  TinyUpload: ElUpload,
  TinyTag: ElTag,
  TinyCard: ElCard,
  TinyCollapse: ElCollapse,
  TinyCollapseItem: ElCollapseItem,
  TinyTabs: ElTabs,
  TinyTabPane: ElTabPane,
  TinyAlert: ElAlert,
  TinyDivider: ElDivider,
  TinyImage: ElImage,
  TinyLink: ElLink,
  TinySpace: ElSpace,
  TinyRow: ElRow,
  TinyCol: ElCol,
  TinyTable: ElTable,
  TinyTableColumn: ElTableColumn,
  TinyDescriptions: ElDescriptions,
  TinyDescriptionsItem: ElDescriptionsItem,
  TinyTimeline: ElTimeline,
  TinyTimelineItem: ElTimelineItem,
  TinySteps: ElSteps,
  TinyStep: ElStep,
  TinyProgress: ElProgress,
  TinyBadge: ElBadge,
  TinyAvatar: ElAvatar,
  TinyTooltip: ElTooltip,
  TinyPopover: ElPopover,
  TinyDialog: ElDialog,
  TinyDrawer: ElDrawer,
  TinyResult: ElResult,
  TinyEmpty: ElEmpty,
  TinyScrollbar: ElScrollbar,
  ElCard,
  ElRow,
  ElCol,
  ElAvatar,
  ElButton,
  ElDivider,
  ElSpace,
  ElForm,
  ElFormItem,
  ElInput,
  ElSelect,
  ElOption,
  ElSwitch,
  ElRadioGroup,
  ElCheckboxGroup,
  ElDatePicker,
  ElTimePicker,
  ElInputNumber,
  ElRate,
  ElSlider,
  ElColorPicker,
  ElUpload,
  ElTag,
  ElCollapse,
  ElCollapseItem,
  ElTabs,
  ElTabPane,
  ElAlert,
  ElImage,
  ElLink,
  ElTable,
  ElTableColumn,
  ElDescriptions,
  ElDescriptionsItem,
  ElTimeline,
  ElTimelineItem,
  ElSteps,
  ElStep,
  ElProgress,
  ElBadge,
  ElTooltip,
  ElPopover,
  ElDialog,
  ElDrawer,
  ElResult,
  ElEmpty,
  ElScrollbar,
  ElText: 'span',
  div: 'div',
  span: 'span',
  p: 'p',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  table: 'table',
  thead: 'thead',
  tbody: 'tbody',
  tr: 'tr',
  th: 'th',
  td: 'td',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
  a: 'a',
  img: 'img',
  button: 'button',
  input: 'input',
  textarea: 'textarea',
  select: 'select',
  option: 'option',
  form: 'form',
  label: 'label',
  section: 'section',
  article: 'article',
  header: 'header',
  footer: 'footer',
  nav: 'nav',
  main: 'main',
  aside: 'aside',
}

function isSchema(child: unknown): child is GenUISchema {
  return typeof child === 'object' && child !== null && 'componentName' in child
}

const resolvedComponent = computed<Component | null>(() => {
  const name = props.schema.componentName
  return COMPONENT_MAP[name] || null
})

const validChildren = computed(() => {
  const c = props.schema.children
  if (!Array.isArray(c)) return []
  return c.filter(item => item !== null && item !== undefined)
})

const hasChildren = computed(() => validChildren.value.length > 0)

const textChildren = computed(() => {
  return validChildren.value.filter((c): c is string => typeof c === 'string')
})

function convertStyle(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {}
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === 'string' || typeof val === 'number') {
      result[key] = String(val)
    }
  }
  return result
}

const SIZE_MAP: Record<string, string> = {
  middle: 'default',
  medium: 'default',
  mini: 'small',
  tiny: 'small',
}

const TYPE_MAP: Record<string, string> = {
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  default: 'default',
  text: 'info',
  link: 'primary',
}

const SHADOW_VALUES = new Set(['always', 'hover', 'never'])

const GENUI_FORM_DATA = 'genui-form-data'
const GENUI_ON_ACTION = 'genui-on-action'
const formData = inject<Record<string, unknown>>(GENUI_FORM_DATA, {})
const onAction = inject<(action: string, data: Record<string, unknown>) => void>(GENUI_ON_ACTION, () => {})

const FORM_COMPONENTS = new Set([
  'ElInput', 'TinyInput',
  'ElSelect', 'TinySelect',
  'ElSwitch', 'TinySwitch',
  'ElRadioGroup', 'TinyRadio',
  'ElCheckboxGroup', 'TinyCheckbox',
  'ElDatePicker', 'TinyDatePicker',
  'ElTimePicker', 'TinyTimePicker',
  'ElInputNumber', 'TinyNumeric',
  'ElRate', 'TinyRate',
  'ElSlider', 'TinySlider',
  'ElColorPicker', 'TinyColorPicker',
  'ElUpload', 'TinyUpload',
])

const resolvedProps = computed(() => {
  const raw = props.schema.props || {}
  const p = { ...raw }
  const compName = props.schema.componentName

  if (typeof p.size === 'string' && SIZE_MAP[p.size]) {
    p.size = SIZE_MAP[p.size]
  }

  if (typeof p.type === 'string' && TYPE_MAP[p.type]) {
    p.type = TYPE_MAP[p.type]
  }

  if ((compName === 'ElButton' || compName === 'TinyButton') && typeof p.type === 'string' && !TYPE_MAP[p.type]) {
    p.type = 'default'
  }

  if (p.style) {
    p.style = convertStyle(p.style)
  }

  if (p.shadow !== undefined) {
    if (typeof p.shadow === 'string' && SHADOW_VALUES.has(p.shadow)) {
      // valid
    } else {
      delete p.shadow
    }
  }

  if (p.underline !== undefined) {
    if (typeof p.underline === 'boolean') {
      p.underline = p.underline ? 'always' : 'never'
    } else if (typeof p.underline === 'string' && !['always', 'hover', 'never'].includes(p.underline)) {
      delete p.underline
    }
  }

  if (p.gutter !== undefined) {
    const num = Number(p.gutter)
    if (!isNaN(num)) {
      p.gutter = num
    } else {
      delete p.gutter
    }
  }

  if ((compName === 'ElOption' || compName === 'TinyOption') && p.value === undefined) {
    p.value = p.label ?? ''
  }

  if (FORM_COMPONENTS.has(compName) && raw.model === undefined) {
    delete p.value
  }

  if (p.labelPosition !== undefined) {
    if (typeof p.labelPosition === 'string' && ['left', 'right', 'top'].includes(p.labelPosition)) {
      // valid
    } else {
      delete p.labelPosition
    }
  }

  if (p.model !== undefined) {
    delete p.model
  }

  return p
})

const componentBindings = computed(() => {
  const bindings: Record<string, unknown> = { ...resolvedProps.value }
  const compName = props.schema.componentName
  const rawProps = props.schema.props || {}

  if (FORM_COMPONENTS.has(compName) && typeof rawProps.model === 'string' && rawProps.model) {
    const key = rawProps.model
    bindings.modelValue = formData[key]
    bindings['onUpdate:modelValue'] = (val: unknown) => {
      formData[key] = val
    }
  }

  if (compName === 'ElButton' || compName === 'TinyButton') {
    bindings['onClick'] = () => {
      const action = (rawProps.action as string) || (rawProps.label as string) || 'submit'
      onAction(action, { ...formData })
    }
  }

  return bindings
})
</script>

<style scoped>
.genui-unknown {
  padding: 8px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary, #999);
}

.genui-streaming {
  display: inline-block;
  padding: 4px 0;
}

.genui-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--color-primary, #409eff);
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>
