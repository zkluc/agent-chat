<template>
  <div class="file-block">
    <el-link type="primary" :href="fileUrl" target="_blank" :download="fileName" underline="hover">
      📄 {{ fileName }}
    </el-link>
    <span class="file-size" v-if="fileSize">({{ fileSize }})</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  block: {
    id: string
    type: string
    content: string
    meta?: Record<string, unknown>
  }
}>()

const fileUrl = computed(() => props.block.content)
const fileName = computed(() => (props.block.meta?.name as string) || '文件')
const fileSize = computed(() => props.block.meta?.size as string | undefined)
</script>

<style scoped>
.file-block {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary, #f5f5f5);
  border-radius: 8px;
  margin: 4px 0;
}
.file-size { font-size: 12px; color: var(--text-secondary, #999); }
</style>
