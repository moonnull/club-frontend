const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tok = getToken()
  const isFormData = init.body instanceof URLSearchParams
  const headers: Record<string, string> = {
    ...(init.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(isFormData ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (res.status === 204) return null as T
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail ?? '오류가 발생했습니다.')
  return data
}

export const api = {
  get: <T>(path: string) => req<T>(path),
  post: <T>(path: string, body: unknown) =>
    req<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    req<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path: string) => req<void>(path, { method: 'DELETE' }),

  login: async (email: string, password: string) => {
    const form = new URLSearchParams({ username: email, password })
    return req<{ access_token: string; token_type: string }>('/api/auth/login', {
      method: 'POST',
      body: form,
    })
  },
}

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
