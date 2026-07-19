<template>
  <ChatWindow />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import ChatWindow from '@/components/chat/ChatWindow.vue'
import { registerDefaultBlocks } from '@/registry/defaults'

onMounted(() => {
  registerDefaultBlocks()
})
</script>

<style>
</style>
