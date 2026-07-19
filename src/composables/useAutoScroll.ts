import { ref, watch, nextTick, type Ref } from 'vue'

export function useAutoScroll(
  isStreaming: Ref<boolean>,
  scrollContainerRef: Ref<HTMLElement | null>,
  shouldFollow: Ref<boolean>,
) {
  const userScrolledUp = ref(false)

  const checkScrollPosition = () => {
    const el = scrollContainerRef.value
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUp.value = distanceFromBottom > 80
  }

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.value
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }

  const scrollToBottomImmediate = () => {
    const el = scrollContainerRef.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  watch(isStreaming, (streaming) => {
    if (streaming && !userScrolledUp.value) {
      nextTick(() => scrollToBottomImmediate())
    }
  })

  return {
    userScrolledUp,
    checkScrollPosition,
    scrollToBottom,
    scrollToBottomImmediate,
  }
}
