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
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers })
  } catch {
    // fetch 자체가 실패하는 건 네트워크 단절이거나 서버가 응답하지 않는 경우다.
    throw new Error('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.')
  }

  if (res.status === 204 || res.status === 205) return null as T

  // 서버가 항상 JSON을 준다고 가정하면, 프록시(502/504)나 프레임워크가 만든
  // HTML 에러 페이지에서 res.json()이 SyntaxError를 던져 실제 원인 대신
  // 엉뚱한 에러가 사용자에게 노출된다.
  const isJson = (res.headers.get('content-type') ?? '').includes('application/json')
  let data: unknown = null
  if (isJson) {
    try {
      data = await res.json()
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    // 로그인 요청 자체의 401(자격증명 오류)은 세션 만료가 아니므로 제외한다.
    if (res.status === 401 && tok && path !== '/api/auth/login') {
      clearAuth()
      window.location.href = '/login?reason=expired'
    }
    throw new Error(detailOf(data) ?? statusMessage(res.status))
  }
  return data as T
}

/** FastAPI의 에러 응답은 { detail: string } 형태다. */
function detailOf(data: unknown): string | null {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail
    if (typeof detail === 'string' && detail) return detail
  }
  return null
}

/** JSON 본문이 없을 때(프록시 에러 등) 상태 코드로 안내 문구를 만든다. */
function statusMessage(status: number): string {
  if (status === 401) return '로그인이 필요합니다.'
  if (status === 403) return '권한이 없습니다.'
  if (status === 404) return '요청한 정보를 찾을 수 없습니다.'
  if (status === 413) return '파일 크기가 너무 큽니다.'
  if (status === 429) return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  if (status >= 500) return `서버에 일시적인 문제가 발생했습니다. (${status})`
  return `요청을 처리하지 못했습니다. (${status})`
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
