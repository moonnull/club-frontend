/**
 * 과제 목록을 화면마다 필요한 범위만 요청하는지.
 *
 * 트랙 상세는 그 트랙만, 캘린더는 보고 있는 달만 쓰는데 셋 다 전체를 받아
 * 클라이언트에서 걸렀다. 과제가 쌓일수록 그 화면들만 무거워진다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTrackSummaries, listAssignments } from '@/lib/api/assignments'

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
    )
  )
})

const url = () => new URL(vi.mocked(fetch).mock.calls[0][0] as string, 'http://x')
const params = () => url().searchParams

describe('listAssignments', () => {
  it('범위를 주지 않으면 조건 없이 부른다 — 기존 호출부의 동작이 바뀌면 안 된다', async () => {
    await listAssignments()
    expect(url().search).toBe('')
  })

  it('트랙 상세는 그 트랙만 요청한다', async () => {
    await listAssignments({ trackId: 3 })
    expect(params().get('track_id')).toBe('3')
  })

  it('캘린더는 보고 있는 달의 범위를 싣는다', async () => {
    await listAssignments({ startsBefore: '2026-09-30T23:59:59', endsAfter: '2026-09-01T00:00:00' })
    expect(params().get('starts_before')).toBe('2026-09-30T23:59:59')
    expect(params().get('ends_after')).toBe('2026-09-01T00:00:00')
  })

  it('과제 인덱스는 첫 과제로 보내기만 하므로 한 건만 받는다', async () => {
    await listAssignments({ limit: 1 })
    expect(params().get('limit')).toBe('1')
  })

  it('offset 0은 굳이 싣지 않는다', async () => {
    await listAssignments({ offset: 0, limit: 10 })
    expect(params().has('offset')).toBe(false)
  })

  it('trackId 0도 값으로 취급한다 — undefined와 구분되어야 한다', async () => {
    await listAssignments({ trackId: 0 })
    expect(params().get('track_id')).toBe('0')
  })
})

describe('getTrackSummaries', () => {
  it('집계 전용 경로를 쓴다 — 전체 목록을 받지 않는다', async () => {
    await getTrackSummaries()
    expect(url().pathname).toBe('/api/assignments/summary')
  })
})
