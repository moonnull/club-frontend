/**
 * API 클라이언트가 실패의 "종류"를 구분해 전달하는지.
 *
 * status를 잃어버리면 화면은 404(없는 글)와 503(서버가 죽음)과 네트워크
 * 단절을 구분할 수 없고, 셋 다 "찾을 수 없습니다"로 안내하게 된다.
 * 실제로 그 버그가 있었다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, isNotFound } from '@/lib/api/client'

function respond(status: number, body: unknown = null, headers: Record<string, string> = {}) {
  const init: Record<string, string> = { ...headers }
  if (body !== null) init['content-type'] = 'application/json'
  return new Response(body === null ? null : JSON.stringify(body), { status, headers: init })
}

// jsdom은 실제 페이지 이동을 구현하지 않아서, 코드가 location.href에 값을
// 넣는 순간 "Not implemented: navigation"이 비동기로 터진다. 어디로 보내려
// 했는지를 대신 기록해 두면 소음도 없어지고 검증도 할 수 있다.
let navigatedTo: string | null = null

/** 실패를 기대하는 호출. 성공해버리면 그 자체가 실패다. */
async function rejected(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (err) {
    return err as ApiError
  }
  throw new Error('실패해야 하는 호출이 성공했습니다.')
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  navigatedTo = null
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      set href(url: string) {
        navigatedTo = url
      },
      get href() {
        return navigatedTo ?? 'http://localhost:3000/'
      },
    },
  })
})

describe('실패의 종류', () => {
  it('404는 isNotFound로 구분된다', async () => {
    vi.mocked(fetch).mockResolvedValue(respond(404, { detail: '과제를 찾을 수 없습니다.' }))
    const err = await rejected(api.get('/api/assignments/1'))

    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(404)
    expect(isNotFound(err)).toBe(true)
    expect(err.message).toBe('과제를 찾을 수 없습니다.')
  })

  it('서버 장애(503)는 404가 아니다', async () => {
    vi.mocked(fetch).mockResolvedValue(respond(503))
    const err = await rejected(api.get('/api/assignments/1'))

    expect(isNotFound(err)).toBe(false)
    expect(err.status).toBe(503)
    expect(err.message).toContain('서버에 일시적인 문제')
  })

  it('네트워크 단절은 status 0이고 404가 아니다', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'))
    const err = await rejected(api.get('/api/assignments/1'))

    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(0)
    expect(isNotFound(err)).toBe(false)
    expect(err.message).toContain('서버에 연결할 수 없습니다')
  })

  it('ApiError는 Error를 상속해 기존 instanceof 검사가 그대로 동작한다', async () => {
    vi.mocked(fetch).mockResolvedValue(respond(400, { detail: '잘못된 요청' }))
    const err = await rejected(api.get('/x'))
    expect(err instanceof Error).toBe(true)
  })

  it('JSON이 아닌 502(프록시 HTML)에서도 엉뚱한 에러가 새지 않는다', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('<html>Bad Gateway</html>', { status: 502, headers: { 'content-type': 'text/html' } })
    )
    const err = await rejected(api.get('/x'))
    expect(err.status).toBe(502)
    expect(err.message).toContain('서버에 일시적인 문제')
  })
})

describe('슬라이딩 세션', () => {
  it('연장된 토큰을 받으면 즉시 갈아끼운다', async () => {
    localStorage.setItem('token', 'old')
    vi.mocked(fetch).mockResolvedValue(respond(200, { ok: true }, { 'X-Renewed-Token': 'new' }))

    await api.get('/api/auth/me')
    expect(localStorage.getItem('token')).toBe('new')
  })

  it('실패 응답에서도 토큰을 갱신한다 — 404도 엄연한 활동이다', async () => {
    localStorage.setItem('token', 'old')
    vi.mocked(fetch).mockResolvedValue(respond(404, { detail: '없음' }, { 'X-Renewed-Token': 'new' }))

    await api.get('/api/posts/1').catch(() => {})
    expect(localStorage.getItem('token')).toBe('new')
  })
})

describe('세션 만료', () => {
  it('401을 받으면 저장된 인증 정보를 지운다', async () => {
    localStorage.setItem('token', 'tok')
    localStorage.setItem('user', '{"id":1}')
    vi.mocked(fetch).mockResolvedValue(respond(401, { detail: '만료' }))

    await api.get('/api/auth/me').catch(() => {})
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
    // 토큰을 보냈다가 401을 받은 것이니 "만료"라고 알리는 게 맞다.
    expect(navigatedTo).toBe('/login?reason=expired')
  })

  it('토큰 없이 받은 401에는 겪지도 않은 만료를 알리지 않는다', async () => {
    vi.mocked(fetch).mockResolvedValue(respond(401, { detail: '로그인이 필요합니다.' }))

    await api.get('/api/posts').catch(() => {})
    expect(navigatedTo).toBe('/login')
  })

  it('로그인 실패의 401은 세션 만료가 아니므로 지우지 않는다', async () => {
    localStorage.setItem('token', 'tok')
    vi.mocked(fetch).mockResolvedValue(respond(401, { detail: '비밀번호가 올바르지 않습니다.' }))

    await api.login('a@b.com', 'wrong').catch(() => {})
    expect(localStorage.getItem('token')).toBe('tok')
    expect(navigatedTo).toBeNull()
  })
})
