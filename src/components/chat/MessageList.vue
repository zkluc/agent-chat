<template>
  <div class="message-list-container">
    <DynamicScroller
      ref="scrollerRef"
      class="message-list"
      :items="scrollerItems"
      :min-item-size="80"
      key-field="id"
      @scroll="onScroll"
    >
      <template #default="{ item, index, active }">
        <DynamicScrollerItem
          :item="item"
          :active="active"
          :data-index="index"
        >
          <MessageBubble
            :message="item.message"
            :streaming="index === messages.length - 1 && isStreaming"
            @retry="(t: string) => emit('retry', t)"
            @regenerate="(id: string) => emit('regenerate', id)"
          />
        </DynamicScrollerItem>
      </template>
    </DynamicScroller>

    <Transition name="fade">
      <div v-if="showJumpToBottom" class="jump-to-bottom" @click="scrollToBottom">
        <el-icon><ArrowDown /></el-icon>
        <span>新消息</span>
      </div>
    </Transition>

    <div v-if="messages.length === 0" class="empty-state">
      <div class="empty-icon">💬</div>
      <div class="empty-text">开始一个新的对话</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ArrowDown } from '@element-plus/icons-vue'
import type { Message } from '@/events/types'
import MessageBubble from './MessageBubble.vue'

const props = defineProps<{
  messages: Message[]
  isStreaming: boolean
}>()

const emit = defineEmits<{
  retry: [text: string]
  regenerate: [id: string]
}>()

const scrollerRef = ref<any>(null)
const showJumpToBottom = ref(false)
const userScrolledUp = ref(false)

const scrollerItems = computed(() =>
  props.messages.map((msg, i) => ({
    id: msg.id,
    message: msg,
  })),
)

watch(
  () => props.messages.length,
  (newLen, oldLen) => {
    if (newLen > oldLen) {
      nextTick(() => {
        if (!userScrolledUp.value) {
          scrollToBottom()
        }
      })
    }
  },
)

watch(
  () => props.isStreaming,
  () => {
    nextTick(() => {
      if (!userScrolledUp.value) {
        scrollToBottom()
      }
    })
  },
)

function onScroll() {
  const el = scrollerRef.value?.$el?.querySelector('.el-scrollbar__wrap') || scrollerRef.value?.$el
  if (!el) return
  const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
  userScrolledUp.value = distanceFromBottom > 80
  showJumpToBottom.value = userScrolledUp.value && props.messages.length > 0
}

function scrollToBottom() {
  if (scrollerRef.value) {
    scrollerRef.value.scrollToBottom()
  }
}
</script>

<style scoped>
.message-list-container {
  position: relative;
  height: 100%;
  overflow: hidden;
}
.message-list {
  height: 100%;
}
.jump-to-bottom {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--doubao-bg-primary);
  color: var(--doubao-text-primary);
  border-radius: var(--doubao-radius-l);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  box-shadow: var(--doubao-shadow-lv2);
  border: 1px solid var(--doubao-border-primary);
  z-index: 10;
  transition: transform 0.2s, box-shadow 0.2s;
}
.jump-to-bottom:hover {
  transform: translateX(-50%) scale(1.05);
  box-shadow: var(--doubao-shadow-lv3);
}
.jump-to-bottom:hover .el-icon {
  color: var(--doubao-brand);
}
.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--doubao-text-quaternary);
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.empty-text {
  font-size: 16px;
  font-weight: 500;
  color: var(--doubao-text-tertiary);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
