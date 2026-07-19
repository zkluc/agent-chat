<template>
  <GenuiConfigProvider :theme="theme">
    <ChatWindow />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import { registerDefaultBlocks } from '@/registry/defaults'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

const theme = computed(() => settings.theme === 'dark' ? 'dark' : 'light')

onMounted(() => {
  registerDefaultBlocks()
})
</script>

<style>
</style>
