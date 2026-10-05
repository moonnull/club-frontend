/** 관리자 일괄 알림·제출 현황 API가 서버 계약대로 요청하는지. */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAssignmentAssignees, listAssignmentProgress, sendBulkNotification } from '@/lib/api/admin'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response('{"sent":2,"skipped_inactive":0}', { status: 201, headers: { 'content-type': 'application/json' } })
    )
  )
})

const call = () => vi.mocked(fetch).mock.calls[0]
const body = () => JSON.parse(call()[1]!.body as string)
const path = () => new URL(call()[0] as string, 'http://x').pathname

describe('sendBulkNotification', () => {
  it('받는 사람·내용·링크를 실어 보낸다', async () => {
    await sendBulkNotification([1, 2], '과제를 내주세요', '/assignments/3')
    expect(path()).toBe('/api/admin/users/bulk/notifications')
    expect(body()).toEqual({ user_ids: [1, 2], message: '과제를 내주세요', link: '/assignments/3' })
  })

  it('링크가 없으면 키 자체를 싣지 않는다', async () => {
    await sendBulkNotification([1], '안내')
    expect(body()).not.toHaveProperty('link')
  })
})

describe('제출 현황', () => {
  it('목록', async () => {
    await listAssignmentProgress()
    expect(path()).toBe('/api/admin/assignments/progress')
  })

  it('과제별 대상자', async () => {
    await getAssignmentAssignees(7)
    expect(path()).toBe('/api/admin/assignments/7/assignees')
  })
})
