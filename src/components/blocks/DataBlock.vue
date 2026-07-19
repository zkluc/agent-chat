<template>
  <div class="data-block">
    <img
      v-if="isImage"
      :src="src"
      :alt="block.meta?.name || 'image'"
      class="data-image"
      loading="lazy"
    />
    <video
      v-else-if="isVideo"
      :src="src"
      controls
      class="data-video"
    />
    <audio
      v-else-if="isAudio"
      :src="src"
      controls
      class="data-audio"
    />
    <div v-else class="data-unknown">
      <span>📎 {{ block.meta?.name || '数据' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

const mediaType = computed(() => (props.block.meta?.media_type as string) || 'image/png')

const src = computed(() => {
  if (props.block.content.startsWith('http')) return props.block.content
  if (props.block.content.startsWith('data:')) return props.block.content
  return `data:${mediaType.value};base64,${props.block.content}`
})

const isImage = computed(() => mediaType.value.startsWith('image/'))
const isVideo = computed(() => mediaType.value.startsWith('video/'))
const isAudio = computed(() => mediaType.value.startsWith('audio/'))
</script>

<style scoped>
.data-block { margin: 6px 0; }
.data-image {
  max-width: 100%;
  border-radius: 8px;
}
.data-video { max-width: 100%; border-radius: 8px; }
.data-audio { width: 100%; }
.data-unknown {
  padding: 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  text-align: center;
  font-size: 13px;
}
</style>
