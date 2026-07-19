<template>
  <div class="table-block" v-if="tableData.length">
    <el-table :data="tableData" border size="small" max-height="400">
      <el-table-column
        v-for="col in columns"
        :key="col"
        :prop="col"
        :label="col"
        show-overflow-tooltip
      />
    </el-table>
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

const tableData = computed(() => {
  try {
    const parsed = JSON.parse(props.block.content)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
})

const columns = computed(() => {
  if (tableData.value.length === 0) return []
  return Object.keys(tableData.value[0])
})
</script>

<style scoped>
.table-block { margin: 8px 0; overflow-x: auto; }
</style>
