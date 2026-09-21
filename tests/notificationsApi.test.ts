/**
 * 알림 "더 보기"가 커서를 제대로 실어 보내는지.
 *
 * offset으로 넘기면 보고 있는 사이에 알림이 새로 와서 한 칸씩 밀린다.
 * 같은 알림이 두 번 보이거나 건너뛰게 된다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NOTIFICATION_PAGE_SIZE, listNotifications } from '@/lib/api/notifications'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    )
  )
})

const calledUrl = () => vi.mocked(fetch).mock.calls[0][0] as string

describe('listNotifications', () => {
  it('첫 페이지는 커서 없이 부른다', async () => {
    await listNotifications()
    expect(calledUrl()).not.toContain('before_id')
  })

  it('더 보기는 마지막 알림 id를 커서로 싣는다', async () => {
    await listNotifications(42)
    expect(calledUrl()).toContain('before_id=42')
  })

  it('offset 방식을 쓰지 않는다', async () => {
    await listNotifications(42)
    expect(calledUrl()).not.toContain('offset')
  })

  it('페이지 크기가 백엔드 기본값과 같다', () => {
    expect(NOTIFICATION_PAGE_SIZE).toBe(30)
  })
})
