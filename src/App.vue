<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { registerDefaultBlocks } from '@/registry/defaults'

onMounted(() => {
  registerDefaultBlocks()
})
</script>

<style>
</style>
