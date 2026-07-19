<template>
  <div class="text-block" v-html="renderedHtml"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'

const props = defineProps<{
  block: {
    id: string
    type: string
    content: string
    streaming: boolean
    complete: boolean
  }
}>()

marked.setOptions({
  gfm: true,
  breaks: true,
})

const renderer = new marked.Renderer()
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  return `<pre class="code-block"><code class="hljs language-${language}">${highlighted}</code></pre>`
}
renderer.codespan = ({ text }: { text: string }) => `<code class="inline-code">${text}</code>`

const renderedHtml = computed(() => {
  if (!props.block.content) return ''
  try {
    return marked.parse(props.block.content, { renderer }) as string
  } catch {
    return props.block.content
  }
})
</script>

<style scoped>
.text-block {
  line-height: 1.7;
  word-break: break-word;
}
.text-block :deep(p) {
  margin: 0.4em 0;
}
.text-block :deep(ul),
.text-block :deep(ol) {
  padding-left: 1.5em;
  margin: 0.4em 0;
}
.text-block :deep(.code-block) {
  background: var(--code-bg, #1e1e2e);
  border-radius: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  font-size: 0.9em;
  margin: 8px 0;
}
.text-block :deep(.inline-code) {
  background: var(--inline-code-bg, rgba(0,0,0,0.06));
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
.text-block :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}
.text-block :deep(th),
.text-block :deep(td) {
  border: 1px solid var(--border-color, #e0e0e0);
  padding: 6px 12px;
  text-align: left;
}
.text-block :deep(th) {
  background: var(--header-bg, #f5f5f5);
}
</style>
