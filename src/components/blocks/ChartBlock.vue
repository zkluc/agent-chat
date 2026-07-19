<template>
  <div class="chart-block" ref="chartRef" style="height: 350px; width: 100%;"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, shallowRef } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{
  block: {
    id: string
    type: string
    content: string
    meta?: Record<string, unknown>
  }
}>()

const chartRef = ref<HTMLElement>()
const chartInstance = shallowRef<echarts.ECharts | null>(null)

function initChart() {
  if (!chartRef.value) return
  if (chartInstance.value) {
    chartInstance.value.dispose()
  }
  chartInstance.value = echarts.init(chartRef.value)

  try {
    const option = JSON.parse(props.block.content)
    chartInstance.value.setOption(option)
  } catch {
    // invalid chart data
  }
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', () => chartInstance.value?.resize())
})

watch(() => props.block.content, () => {
  initChart()
})
</script>

<style scoped>
.chart-block { margin: 8px 0; border: 1px solid var(--border-color, #eee); border-radius: 8px; }
</style>
