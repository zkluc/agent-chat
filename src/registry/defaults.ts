import { blockRegistry } from './index'
import TextBlock from '@/components/blocks/TextBlock.vue'
import ThinkingBlock from '@/components/blocks/ThinkingBlock.vue'
import ToolCallBlock from '@/components/blocks/ToolCallBlock.vue'
import ToolResultBlock from '@/components/blocks/ToolResultBlock.vue'
import DataBlock from '@/components/blocks/DataBlock.vue'
import HintBlock from '@/components/blocks/HintBlock.vue'
import CustomBlock from '@/components/blocks/CustomBlock.vue'
import TableBlock from '@/components/blocks/TableBlock.vue'
import ChartBlock from '@/components/blocks/ChartBlock.vue'
import FileBlock from '@/components/blocks/FileBlock.vue'
import GenUIBlock from '@/components/blocks/GenUIBlock.vue'

export function registerDefaultBlocks() {
  blockRegistry.register({ type: 'genui', component: GenUIBlock, priority: 15 })
  blockRegistry.register({ type: 'text', component: TextBlock, priority: 10 })
  blockRegistry.register({ type: 'thinking', component: ThinkingBlock, priority: 9 })
  blockRegistry.register({ type: 'tool_call', component: ToolCallBlock, priority: 8 })
  blockRegistry.register({ type: 'tool_result', component: ToolResultBlock, priority: 7 })
  blockRegistry.register({ type: 'data', component: DataBlock, priority: 6 })
  blockRegistry.register({ type: 'hint', component: HintBlock, priority: 5 })
  blockRegistry.register({ type: 'table', component: TableBlock, priority: 4 })
  blockRegistry.register({ type: 'chart', component: ChartBlock, priority: 3 })
  blockRegistry.register({ type: 'file', component: FileBlock, priority: 2 })
  blockRegistry.register({ type: 'custom', component: CustomBlock, priority: 1 })
}
