import { clearAuth } from '../session'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/** 서버가 연장된 토큰을 실어 보내는 헤더 (app/core/deps.py의 RENEWED_TOKEN_HEADER) */
const RENEWED_TOKEN_HEADER = 'X-Renewed-Token'

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

  // 슬라이딩 세션 — 서버는 활동 중인 세션의 토큰을 새로 발급해 이 헤더로 돌려준다.
  // 받는 즉시 갈아끼워야 다음 요청이 연장된 만료 시각을 들고 나간다.
  // 성공/실패를 가리지 않고 확인한다 (404 같은 응답도 엄연한 활동이다).
  const renewedToken = res.headers.get(RENEWED_TOKEN_HEADER)
  if (renewedToken && typeof window !== 'undefined') {
    try {
      localStorage.setItem('token', renewedToken)
    } catch {
      // 저장에 실패해도 이번 요청 자체는 정상이다. 다음 요청에서 다시 받는다.
    }
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
    // 401은 세션이 끝났다는 뜻이다. 토큰 유무로 거르면 안 된다 — 다른 탭에서
    // 로그아웃해 토큰이 이미 지워진 경우가 정확히 그 상황인데, 그때 리다이렉트가
    // 걸리지 않아 에러 토스트만 반복되며 화면에 갇힌다.
    // 로그인 요청 자체의 401(자격증명 오류)만 세션 만료가 아니므로 제외한다.
    if (res.status === 401 && path !== '/api/auth/login') {
      clearAuth()
      // "세션이 만료되었다"는 안내는 실제로 토큰을 보냈을 때만 맞는 말이다.
      // 토큰 없이 받은 401(로그아웃 직후 남은 요청 등)까지 그렇게 알리면
      // 겪지도 않은 만료를 겪었다고 하는 셈이다.
      window.location.href = tok ? '/login?reason=expired' : '/login'
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
