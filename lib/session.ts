export function saveAuth(token: string, user: object) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function getStoredUser<T>(): T | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('user')
  return raw ? (JSON.parse(raw) as T) : null
}
