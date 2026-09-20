/**
 * 같은 탭 안에서 화면끼리 주고받는 신호.
 *
 * 과제 사이드바(layout)와 상세·작성 화면(page)은 레이아웃과 페이지로 갈라져 있어
 * props로 상태를 전달할 수 없다. 그리고 서버는 WebSocket 알림에서 **행위자 본인을
 * 제외**하기 때문에, 내가 직접 한 동작은 나에게 돌아오지 않는다.
 * 그래서 목록을 바꾸는 동작 뒤에는 이 신호를 직접 쏜다.
 * lib/session.ts의 'auth-changed'와 같은 방식이다.
 */
export const ASSIGNMENT_LIST_CHANGED_EVENT = 'assignment-list-changed'

/** 과제 등록·수정·삭제, 제출·제출 취소 뒤에 호출한다. */
export function notifyAssignmentListChanged(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(ASSIGNMENT_LIST_CHANGED_EVENT))
}
