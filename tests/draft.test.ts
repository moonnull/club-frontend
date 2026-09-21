/**
 * 과제 작성 내용의 자동 보관.
 *
 * 저장이 "임시 저장" 버튼에만 달려 있어서 누르지 않고 나가면 내용이 사라졌다.
 * 공용 PC에서 남의 초안이 보이면 안 되고, 브라우저가 저장을 막아도
 * 작성 자체는 계속돼야 한다.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearDraft, loadDraft, pruneExpiredDrafts, saveDraft } from '@/lib/draft'

const DAY = 24 * 60 * 60 * 1000

beforeEach(() => localStorage.clear())

describe('보관과 복구', () => {
  it('저장한 내용을 그대로 되살린다', () => {
    saveDraft(1, 7, { title: '제출', content: '<p>풀이</p>', file: null })
    expect(loadDraft(1, 7)).toMatchObject({ title: '제출', content: '<p>풀이</p>', file: null })
  })

  it('다른 회원의 초안은 보이지 않는다 — 공용 PC에서 남의 글이 뜨면 안 된다', () => {
    saveDraft(1, 7, { title: '내 글', content: 'x', file: null })
    expect(loadDraft(1, 99)).toBeNull()
  })

  it('다른 과제의 초안과 섞이지 않는다', () => {
    saveDraft(1, 7, { title: '1번 과제', content: 'a', file: null })
    saveDraft(2, 7, { title: '2번 과제', content: 'b', file: null })
    expect(loadDraft(1, 7)?.title).toBe('1번 과제')
    expect(loadDraft(2, 7)?.title).toBe('2번 과제')
  })

  it('로그인 정보가 아직 없으면 저장도 복구도 하지 않는다', () => {
    saveDraft(1, undefined, { title: 'x', content: 'y', file: null })
    expect(localStorage.length).toBe(0)
    expect(loadDraft(1, undefined)).toBeNull()
  })

  it('제출을 마치면 지운다', () => {
    saveDraft(1, 7, { title: 'x', content: 'y', file: null })
    clearDraft(1, 7)
    expect(loadDraft(1, 7)).toBeNull()
  })
})

describe('만료', () => {
  it('오래된 초안은 되살리지 않는다', () => {
    vi.setSystemTime(new Date('2026-01-01'))
    saveDraft(1, 7, { title: '옛날 글', content: 'x', file: null })
    vi.setSystemTime(new Date('2026-06-01'))  // 5개월 뒤
    expect(loadDraft(1, 7)).toBeNull()
    vi.useRealTimers()
  })

  it('최근 초안은 정리에서 살아남는다', () => {
    vi.setSystemTime(Date.now())
    saveDraft(1, 7, { title: '최근 글', content: 'x', file: null })
    vi.setSystemTime(Date.now() + 3 * DAY)
    pruneExpiredDrafts()
    expect(loadDraft(1, 7)?.title).toBe('최근 글')
    vi.useRealTimers()
  })

  it('정리는 다른 앱의 저장값을 건드리지 않는다', () => {
    localStorage.setItem('token', 'keep-me')
    localStorage.setItem('theme', 'dark')
    pruneExpiredDrafts()
    expect(localStorage.getItem('token')).toBe('keep-me')
    expect(localStorage.getItem('theme')).toBe('dark')
  })
})

describe('실패해도 작성을 막지 않는다', () => {
  it('너무 큰 초안은 저장하지 않는다 — 한도를 채우면 다른 저장까지 실패한다', () => {
    saveDraft(1, 7, { title: 't', content: 'x'.repeat(600 * 1024), file: null })
    expect(loadDraft(1, 7)).toBeNull()
  })

  it('브라우저가 저장을 막아도 예외를 던지지 않는다 (비공개 모드 등)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(() => saveDraft(1, 7, { title: 'x', content: 'y', file: null })).not.toThrow()
  })

  it('저장값이 깨져 있어도 화면이 죽지 않는다', () => {
    localStorage.setItem('assignment-draft:7:1', '{깨진 JSON')
    expect(() => loadDraft(1, 7)).not.toThrow()
    expect(loadDraft(1, 7)).toBeNull()
  })
})
