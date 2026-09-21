/** 과제를 운영할 수 있는 역할인지 판단하는 규칙. 화면 곳곳의 권한 표시가 여기에 걸려 있다. */
import { describe, expect, it } from 'vitest'
import { canReviewAssignment, isAssignmentStaff } from '@/lib/role'
import type { User } from '@/lib/types'

const as = (role: User['role'], id = 1) => ({ id, role }) as User

describe('isAssignmentStaff', () => {
  it.each([
    ['ADMIN', true],
    ['MENTOR', true],
    ['MEMBER', false],
  ] as const)('%s → %s', (role, expected) => {
    expect(isAssignmentStaff(as(role))).toBe(expected)
  })

  it('로그인하지 않았으면 staff가 아니다', () => {
    expect(isAssignmentStaff(null)).toBe(false)
    expect(isAssignmentStaff(undefined)).toBe(false)
  })
})

describe('canReviewAssignment', () => {
  it('관리자는 남의 과제도 채점한다', () => {
    expect(canReviewAssignment(as('ADMIN', 1), 99)).toBe(true)
  })

  it('멘토는 본인이 낸 과제만 채점한다', () => {
    expect(canReviewAssignment(as('MENTOR', 7), 7)).toBe(true)
    expect(canReviewAssignment(as('MENTOR', 7), 8)).toBe(false)
  })

  it('일반 회원은 본인이 쓴 과제여도 채점할 수 없다', () => {
    expect(canReviewAssignment(as('MEMBER', 7), 7)).toBe(false)
  })
})
