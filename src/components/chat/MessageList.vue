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
  background: var(--primary-color, #409eff);
  color: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
  transition: transform 0.2s;
}
.jump-to-bottom:hover {
  transform: translateX(-50%) scale(1.05);
}
.empty-state {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: var(--text-secondary, #999);
}
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 16px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
