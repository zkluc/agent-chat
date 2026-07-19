# GenUI SDK 融合实施计划（方案三：混合模式）

## 1. 项目现状分析

### 1.1 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5 | 前端框架 |
| TypeScript | 6.0 | 类型系统 |
| Vite | 8.1 | 构建工具 |
| Element Plus | 2.14 | UI 组件库 |
| Pinia | 4.0 | 状态管理 |
| ECharts | 6.1 | 图表渲染 |

### 1.2 现有 GenUI 架构

项目已具备 GenUI 渲染能力：

- **BlockRegistry** (`src/registry/index.ts`): 组件注册表，支持按类型映射 Vue 组件
- **GenUIBlock.vue** (`src/components/blocks/GenUIBlock.vue`): GenUI 消息块容器，提供 formData 双向绑定和 onAction 回调
- **GenUIRenderer.vue** (`src/components/blocks/GenUIRenderer.vue`): 手写的 Schema 渲染器，硬编码 Element Plus 组件映射，递归渲染组件树
- **detectGenUI** (`src/utils/genui.ts`): 流式 JSON 检测，支持增量解析，自动将 text block 转为 genui block

### 1.3 现有问题

| 问题 | 说明 |
|------|------|
| 不支持 JSExpression | `props` 只支持静态值，无法绑定 `this.state.xxx` |
| 不支持 JSFunction | 事件处理只能硬编码 onClick，不支持自定义方法 |
| 不支持 condition/loop | 缺少条件渲染和循环渲染能力 |
| 不支持 slot | 无法使用插槽机制 |
| 不支持 state | 无全局状态管理，form 数据通过 provide/inject 实现 |
| 组件映射硬编码 | 新增组件需修改 GenUIRenderer.vue 源码 |

## 2. GenUI SDK 能力概览

### 2.1 核心组件

| 组件 | 说明 |
|------|------|
| `GenuiRenderer` | Schema 渲染器，支持完整的 Schema 协议 |
| `GenuiChat` | 集成式对话组件（不使用，保留现有 ChatWindow） |
| `GenuiConfigProvider` | 主题和配置提供者 |

### 2.2 Schema 协议支持

- **JSExpression**: `{ type: 'JSExpression', value: 'this.state.xxx', model?: boolean }`
- **JSFunction**: `{ type: 'JSFunction', value: 'function() { ... }' }`
- **JSSlot**: `{ type: 'JSSlot', value: ... }`
- **condition**: 条件渲染
- **loop / loopArgs**: 循环渲染
- **state**: 全局状态管理
- **methods**: 方法集合

### 2.3 扩展能力

- **customComponents**: 自定义组件映射表
- **customActions**: 自定义动作（带参数描述，LLM 可调用）
- **state**: 全局状态注入
- **generating**: 流式生成状态

## 3. 融合方案：混合模式

### 3.1 核心思路

保留现有 ChatWindow / MessageList / MessageBubble / BlockRenderer 架构，仅在 `GenUIBlock.vue` 中替换渲染器：

```
现有架构（保留）          GenUI SDK（引入）
┌─────────────┐         ┌──────────────┐
│ ChatWindow   │         │              │
│ MessageList  │         │              │
│ MessageBubble│         │              │
│ BlockRenderer│         │              │
│ GenUIBlock   │ ──替换──>│ GenuiRenderer│
└─────────────┘         └──────────────┘
```

### 3.2 实施步骤

#### 步骤 1: 安装依赖

```bash
npm install @opentiny/genui-sdk-vue
```

#### 步骤 2: 创建自定义组件映射文件

创建 `src/components/genui/customComponents.ts`，将现有 GenUIRenderer.vue 中硬编码的 Element Plus 组件映射导出为 `customComponents` 对象。

#### 步骤 3: 创建自定义 Actions 文件

创建 `src/components/genui/customActions.ts`，定义业务动作：
- `submitForm`: 收集表单数据并发送用户消息
- `navigate`: 页面跳转
- `showNotification`: 显示通知

#### 步骤 4: 创建 genui 配置入口

创建 `src/components/genui/index.ts`，统一导出 customComponents、customActions 和 GenuiRenderer 包装组件。

#### 步骤 5: 替换 GenUIBlock.vue 中的渲染器

将 `GenUIRenderer.vue` 替换为 Genui SDK 的 `GenuiRenderer`，传入 customComponents、customActions、state、generating 等 props。

#### 步骤 6: 配置 GenuiConfigProvider

在 `App.vue` 中用 `GenuiConfigProvider` 包裹根组件，统一主题配置。

#### 步骤 7: 服务端协议对齐

在 `useStreamProtocol.ts` 的请求 body 中添加 `metadata.tinygenui`，将 customActions 信息发送给 LLM。

#### 步骤 8: 更新系统提示词

更新 `GENUI_SYSTEM_PROMPT`，对齐 GenUI SDK 的 Schema 协议规范（使用 Page 根节点、state、methods、CanvasFlexBox 布局等）。

### 3.3 文件变更清单

| 操作 | 文件路径 | 说明 |
|------|----------|------|
| 新建 | `src/components/genui/customComponents.ts` | Element Plus 组件映射 |
| 新建 | `src/components/genui/customActions.ts` | 自定义动作定义 |
| 新增 | `src/components/genui/index.ts` | 统一导出 |
| 修改 | `src/components/blocks/GenUIBlock.vue` | 替换渲染器为 GenuiRenderer |
| 修改 | `src/App.vue` | 添加 GenuiConfigProvider |
| 修改 | `src/composables/useStreamProtocol.ts` | 添加 metadata.tinygenui + 更新提示词 |
| 修改 | `package.json` | 新增 @opentiny/genui-sdk-vue 依赖 |
| 废弃 | `src/components/blocks/GenUIRenderer.vue` | 由 GenuiRenderer 替代（保留不删除） |

### 3.4 兼容性保证

- **向后兼容**: 现有 text/thinking/tool_call/tool_result/data/hint block 不受影响
- **渐进迁移**: GenUIBlock 同时支持新旧两种渲染方式（通过 fallback）
- **无破坏性**: 不修改 BlockRegistry、StreamProcessor、协议层等核心模块

## 4. 预期收益

| 收益 | 说明 |
|------|------|
| 完整 Schema 协议 | 支持 JSExpression/JSFunction/condition/loop/slot |
| 状态管理 | 通过 state 实现组件间数据共享 |
| 流式渲染 | GenuiRenderer 原生支持流式 JSON 增量渲染 |
| 扩展性 | 通过 customComponents/customActions 无缝扩展 |
| 主题一致 | GenuiConfigProvider 统一主题管理 |
| LLM 友好 | metadata.tinygenui 让 LLM 了解可用组件和动作 |
