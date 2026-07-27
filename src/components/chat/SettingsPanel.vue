<template>
  <!-- 桌面端固定侧边栏 -->
  <div class="settings-desktop" :class="{ hidden: !desktopVisible }">
    <div class="settings-header">
      <h3 class="settings-title">设置</h3>
    </div>
    <div class="settings-content">
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
  </div>

  <!-- 移动端抽屉 -->
  <el-drawer v-model="drawerVisible" title="设置" direction="rtl" size="280px">
    <div class="settings-content">
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
  </el-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{
  modelValue?: boolean
  desktopVisible?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const drawerVisible = computed({
  get: () => props.modelValue ?? false,
  set: (v) => emit('update:modelValue', v),
})

const settings = useSettingsStore()
</script>

<style scoped>
.settings-desktop {
  width: 280px;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--doubao-border-primary);
  background: var(--doubao-bg-secondary);
  height: 100vh;
  overflow: hidden;
  transition: width 0.2s, min-width 0.2s, opacity 0.2s;
}
.settings-desktop.hidden {
  width: 0;
  min-width: 0;
  border-left: none;
  opacity: 0;
  overflow: hidden;
}
@media (max-width: 767px) {
  .settings-desktop {
    display: none;
  }
}

.settings-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--doubao-border-primary);
  flex-shrink: 0;
}
.settings-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--doubao-text-primary);
}
.settings-content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}
</style>
