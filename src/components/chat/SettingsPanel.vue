<template>
  <div class="settings-panel">
    <el-form label-position="top" size="default">
      <el-divider content-position="left">API 配置</el-divider>

      <el-form-item label="服务地址">
        <el-input v-model="settings.baseUrl" placeholder="https://apihub.agnes-ai.com" />
      </el-form-item>

      <el-form-item label="API 路径">
        <el-input v-model="settings.apiPath" placeholder="/v1/chat/completions" />
      </el-form-item>

      <el-form-item label="API Key">
        <el-input v-model="settings.apiKey" type="password" show-password placeholder="sk-..." />
      </el-form-item>

      <el-form-item label="模型">
        <el-input v-model="settings.model" placeholder="agnes-2.0-flash" />
      </el-form-item>

      <el-divider content-position="left">高级</el-divider>

      <el-form-item label="通信协议">
        <el-select v-model="settings.protocol" style="width: 100%">
          <el-option label="SSE (Server-Sent Events)" value="sse" />
          <el-option label="WebSocket" value="websocket" />
          <el-option label="NDJSON" value="ndjson" />
        </el-select>
      </el-form-item>

      <el-form-item label="用户 ID">
        <el-input v-model="settings.userId" placeholder="user-001" />
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
</script>

<style scoped>
.settings-panel {
  padding: 0 4px;
}
</style>
