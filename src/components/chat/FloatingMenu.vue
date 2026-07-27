<template>
  <Teleport to="body">
    <Transition name="menu-fade">
      <div v-if="visible" class="floating-menu-overlay" @click.self="close">
        <div class="floating-menu" :style="menuStyle" ref="menuRef">
          <div
            v-for="item in menuItems"
            :key="item.key"
            class="menu-item"
            @click="handleClick(item)"
          >
            <el-icon class="menu-item-icon" :size="16"><component :is="item.icon" /></el-icon>
            <span class="menu-item-label">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Setting, Delete, Document, ArrowRight, InfoFilled } from '@element-plus/icons-vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'close': []
  'action': [key: string]
}>()

const menuRef = ref<HTMLElement>()

const menuItems = [
  { key: 'settings', label: '设置', icon: Setting },
  { key: 'clear', label: '清空对话', icon: Delete },
  { key: 'export', label: '导出对话', icon: Document },
  { key: 'new-window', label: '新窗口打开', icon: ArrowRight },
  { key: 'about', label: '关于', icon: InfoFilled },
]

const menuStyle = computed(() => ({
  position: 'fixed' as const,
  bottom: '80px',
  right: '24px',
}))

function handleClick(item: { key: string }) {
  emit('action', item.key)
  close()
}

function close() {
  emit('close')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.visible) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.floating-menu-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
}

.floating-menu {
  width: 200px;
  background: var(--doubao-bg-primary);
  border-radius: var(--doubao-radius-s);
  box-shadow: var(--doubao-shadow-lv3);
  border: 1px solid var(--doubao-border-primary);
  padding: 6px;
  z-index: 2001;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.12s;
  font-size: 14px;
  color: var(--doubao-text-secondary);
}
.menu-item:hover {
  background: var(--doubao-bg-base);
  color: var(--doubao-text-primary);
}
.menu-item-icon {
  flex-shrink: 0;
  color: var(--doubao-text-secondary);
}
.menu-item:hover .menu-item-icon {
  color: var(--doubao-brand);
}
.menu-item-label {
  flex: 1;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.15s;
}
.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
}
</style>
