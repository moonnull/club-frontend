import { clearAuth } from '../session'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tok = getToken()
  const isUrlEncoded = init.body instanceof URLSearchParams
  const isMultipart = init.body instanceof FormData
  const headers: Record<string, string> = {
    ...(init.body && !isUrlEncoded && !isMultipart ? { 'Content-Type': 'application/json' } : {}),
    ...(isUrlEncoded ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
    ...(init.headers as Record<string, string> | undefined),
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (res.status === 204) return null as T
  const data = await res.json()
  if (!res.ok) {
    // 로그인 요청 자체의 401(자격증명 오류)은 세션 만료가 아니므로 제외한다.
    if (res.status === 401 && tok && path !== '/api/auth/login') {
      clearAuth()
      window.location.href = '/login?reason=expired'
    }
    throw new Error(data.detail ?? '오류가 발생했습니다.')
  }
  return data
}

export const api = {
  get: <T>(path: string) => req<T>(path),
  post: <T>(path: string, body: unknown) =>
    req<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    req<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path: string) => req<void>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return req<T>(path, { method: 'POST', body: form })
  },

  login: async (email: string, password: string) => {
    const form = new URLSearchParams({ username: email, password })
    return req<{ access_token: string; token_type: string }>('/api/auth/login', {
      method: 'POST',
      body: form,
    })
  },
}
