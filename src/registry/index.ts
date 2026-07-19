import type { Component } from 'vue'

export interface BlockComponentConfig {
  type: string
  component: Component
  priority?: number
}

class BlockRegistry {
  private registry = new Map<string, BlockComponentConfig>()

  register(config: BlockComponentConfig) {
    this.registry.set(config.type, config)
  }

  get(type: string): Component | undefined {
    return this.registry.get(type)?.component
  }

  has(type: string): boolean {
    return this.registry.has(type)
  }

  getAll(): BlockComponentConfig[] {
    return Array.from(this.registry.values()).sort(
      (a, b) => (b.priority || 0) - (a.priority || 0),
    )
  }
}

export const blockRegistry = new BlockRegistry()
