function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// 백엔드는 UTC datetime을 타임존 표기 없이 반환한다(예: "2026-07-08T07:54:38").
// 타임존 표기가 없는 ISO 문자열은 브라우저 로컬 시간으로 해석되어 KST 등에서
// 시각이 어긋나므로, UTC로 명시해서 파싱한다.
export function toDate(iso: string): Date {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`)
}

export function formatDeadline(startAt: string, endAt: string): string {
  const start = toDate(startAt)
  const end = toDate(endAt)
  const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return `${dateStr(start)} ~ ${dateStr(end)} ${timeStr(end)} (${duration(start, end)})`
}

export function isBeforeStart(startAt: string): boolean {
  return new Date() < toDate(startAt)
}

export function isPastDeadline(endAt: string): boolean {
  return new Date() > toDate(endAt)
}

/** 과제 카드용 짧은 표기 — "03월 09일 ~ 03월 22일 오후 4시 (2주)" */
export function formatDeadlineShort(startAt: string, endAt: string): string {
  const start = toDate(startAt)
  const end = toDate(endAt)
  const md = (d: Date) => `${pad(d.getMonth() + 1)}월 ${pad(d.getDate())}일`
  const h = end.getHours()
  const m = end.getMinutes()
  const ampm = h < 12 ? '오전' : '오후'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  const timeStr = m === 0 ? `${ampm} ${hour12}시` : `${ampm} ${hour12}시 ${m}분`
  return `${md(start)} ~ ${md(end)} ${timeStr} (${duration(start, end)})`
}

/** 과제 기간을 "2주" / "5일"처럼 표기 */
export function duration(start: Date, end: Date): string {
  const days = Math.round((end.getTime() - start.getTime()) / 86400000)
  return days >= 7 && days % 7 === 0 ? `${days / 7}주` : `${days}일`
}
