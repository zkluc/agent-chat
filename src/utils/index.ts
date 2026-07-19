export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>
  return ((...args: any[]) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }) as T
}

export function throttle<T extends (...args: any[]) => any>(fn: T, limit: number): T {
  let inThrottle = false
  return ((...args: any[]) => {
    if (!inThrottle) {
      fn(...args)
      inThrottle = true
      setTimeout(() => { inThrottle = false }, limit)
    }
  }) as T
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}
