import { ref, watch, nextTick, type Ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'

export function useVirtualMessages(
  messages: Ref<any[]>,
  isStreaming: Ref<boolean>,
  scrollContainerRef: Ref<HTMLElement | null>,
) {
  const showJumpToBottom = ref(false)

  const virtualizer = useVirtualizer({
    count: () => messages.value.length,
    getScrollElement: () => scrollContainerRef.value,
    estimateSize: () => 120,
    getItemKey: (index: number) => {
      const list = messages.value
      return list[index]?.id ?? `idx-${index}`
    },
    anchorTo: 'end' as const,
    followOnAppend: true,
    scrollEndThreshold: 80,
    overscan: 6,
  })

  watch(
    () => messages.value.length,
    (newLen, oldLen) => {
      if (newLen > oldLen) {
        nextTick(() => {
          virtualizer.value.scrollToIndex(messages.value.length - 1, { align: 'end' })
        })
      }
    },
  )

  const scrollToBottom = () => {
    virtualizer.value.scrollToEnd({ align: 'end', behavior: 'smooth' })
  }

  return {
    virtualizer,
    showJumpToBottom,
    scrollToBottom,
  }
}
