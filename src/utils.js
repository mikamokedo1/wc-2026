// Generates a consistent color from a string (username)
const COLORS = [
  '#7c6af7', '#a855f7', '#ec4899', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
  '#e11d48', '#10b981', '#f59e0b', '#8b5cf6',
]

export function getAvatarColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hôm nay'
  if (date.toDateString() === yesterday.toDateString()) return 'Hôm qua'
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function isSameDay(ts1, ts2) {
  if (!ts1 || !ts2) return false
  const d1 = ts1.toDate ? ts1.toDate() : new Date(ts1)
  const d2 = ts2.toDate ? ts2.toDate() : new Date(ts2)
  return d1.toDateString() === d2.toDateString()
}
