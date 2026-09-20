import type { UploadResult } from './types'

/**
 * 과제 제출 작성 내용을 브라우저에 자동 보관한다.
 *
 * 저장이 "임시 저장" 버튼에만 달려 있어서, 누르지 않고 다른 과제를 클릭하거나
 * 탭을 닫으면 쓰던 내용이 그대로 사라졌다. 서버로 보내지 않고 브라우저에만
 * 두는 이유는, 세션이 끊긴 뒤에도 내용이 남아 있어야 하기 때문이다
 * (자동 저장을 서버로 보내면 만료된 토큰으로 조용히 실패한다).
 */
export interface AssignmentDraft {
  title: string
  content: string
  file: UploadResult | null
  savedAt: number
}

/** 공용 PC에서 다른 사람의 작성 내용이 보이면 안 되므로 회원 id까지 넣는다. */
function keyOf(assignmentId: string | number, userId: number): string {
  return `assignment-draft:${userId}:${assignmentId}`
}

const PREFIX = 'assignment-draft:'
/** 이만큼 지난 초안은 무시하고 지운다. 제출이 끝난 과제의 초안이 영원히 남지 않게 한다. */
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
/**
 * 한 건이 이보다 크면 저장하지 않는다. localStorage는 출처당 몇 MB뿐이라,
 * 긴 초안 몇 개가 한도를 채우면 다른 저장까지 실패한다.
 */
const MAX_BYTES = 512 * 1024

export function loadDraft(
  assignmentId: string | number,
  userId: number | undefined
): AssignmentDraft | null {
  if (typeof window === 'undefined' || userId === undefined) return null
  try {
    const raw = localStorage.getItem(keyOf(assignmentId, userId))
    if (!raw) return null
    const draft = JSON.parse(raw) as AssignmentDraft
    if (typeof draft?.content !== 'string' || typeof draft?.savedAt !== 'number') {
      // 형식이 깨진 값은 되살리지 않는다.
      clearDraft(assignmentId, userId)
      return null
    }
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      clearDraft(assignmentId, userId)
      return null
    }
    return draft
  } catch {
    // 비공개 모드·저장소 차단에서는 조용히 포기한다. 작성 자체를 막으면 안 된다.
    return null
  }
}

export function saveDraft(
  assignmentId: string | number,
  userId: number | undefined,
  draft: Omit<AssignmentDraft, 'savedAt'>
): void {
  if (typeof window === 'undefined' || userId === undefined) return
  try {
    const payload = JSON.stringify({ ...draft, savedAt: Date.now() })
    if (payload.length > MAX_BYTES) {
      // 한도를 넘기면 저장을 건너뛴다. 예전 초안을 남겨두면 더 오래된 내용으로
      // 복구될 수 있어 함께 지운다.
      clearDraft(assignmentId, userId)
      return
    }
    localStorage.setItem(keyOf(assignmentId, userId), payload)
  } catch {
    // 용량 초과 등은 무시한다 — 자동 보관은 부가 기능이고, 실패해도 작성은 계속된다.
  }
}

export function clearDraft(assignmentId: string | number, userId: number | undefined): void {
  if (typeof window === 'undefined' || userId === undefined) return
  try {
    localStorage.removeItem(keyOf(assignmentId, userId))
  } catch {
    /* 무시 */
  }
}

/** 오래된 초안을 한 번에 치운다. 과제 화면에 들어올 때 호출한다. */
export function pruneExpiredDrafts(): void {
  if (typeof window === 'undefined') return
  try {
    const stale: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key?.startsWith(PREFIX)) continue
      try {
        const draft = JSON.parse(localStorage.getItem(key) ?? '') as AssignmentDraft
        if (!draft?.savedAt || Date.now() - draft.savedAt > MAX_AGE_MS) stale.push(key)
      } catch {
        stale.push(key)
      }
    }
    stale.forEach((key) => localStorage.removeItem(key))
  } catch {
    /* 무시 */
  }
}
