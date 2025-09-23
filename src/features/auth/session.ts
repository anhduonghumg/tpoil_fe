export type User = { id: string; email?: string; name?: string }

const LS_KEY = 'erp:user'

export function saveUserToCache(u: User | null) {
  if (!u) localStorage.removeItem(LS_KEY)
  else localStorage.setItem(LS_KEY, JSON.stringify(u))
}

export function loadUserFromCache(): User | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) as User : null
  } catch { return null }
}
