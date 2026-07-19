const CACHE_KEY = 'agent_chat_conversations'

export function saveToCache(data: string): void {
  try {
    localStorage.setItem(CACHE_KEY, data)
  } catch (e) {
    console.error('Failed to save to cache:', e)
  }
}

export function loadFromCache(): string | null {
  try {
    return localStorage.getItem(CACHE_KEY)
  } catch (e) {
    console.error('Failed to load from cache:', e)
    return null
  }
}

export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch (e) {
    console.error('Failed to clear cache:', e)
  }
}
