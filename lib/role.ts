import type { User } from './types'

export const ROLE_LABEL: Record<User['role'], string> = {
  MEMBER: '일반 회원',
  MENTOR: '멘토',
  ADMIN: '관리자',
}

/**
 * 과제를 운영하는 역할(관리자·멘토)인지.
 * 과제 등록과 플랜·트랙 제한 없는 과제 열람이 여기에 달려 있다.
 * 회원 관리·플랜/트랙 설정은 관리자 전용이므로 이 함수를 쓰지 않는다.
 */
export function isAssignmentStaff(
  // role만 읽으므로 목록에 딸려오는 축소형(Author)도 그대로 받는다.
  user: Pick<User, 'role'> | null | undefined
): boolean {
  return user?.role === 'ADMIN' || user?.role === 'MENTOR'
}

/**
 * 이 과제의 제출물을 열람·채점할 수 있는지.
 * 관리자는 전부, 멘토는 자기가 낸 과제만이다 (백엔드 _can_review와 같은 규칙).
 */
export function canReviewAssignment(
  user: User | null | undefined,
  assignmentAuthorId: number | undefined
): boolean {
  if (!user) return false
  if (user.role === 'ADMIN') return true
  return user.role === 'MENTOR' && user.id === assignmentAuthorId
}
