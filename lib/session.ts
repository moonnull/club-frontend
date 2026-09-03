export function saveAuth(token: string, user: object) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
  window.dispatchEvent(new Event('auth-changed'))
}

export function clearAuth() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.dispatchEvent(new Event('auth-changed'))
}

export function getStoredUser<T>(): T | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    // 저장된 값이 깨졌으면 앱 전체가 죽는 대신 로그아웃 상태로 취급한다.
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    return null
  }
}
