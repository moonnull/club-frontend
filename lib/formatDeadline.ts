function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// 백엔드는 UTC datetime을 타임존 표기 없이 반환한다(예: "2026-07-08T07:54:38").
// 타임존 표기가 없는 ISO 문자열은 브라우저 로컬 시간으로 해석되어 KST 등에서
// 시각이 어긋나므로, UTC로 명시해서 파싱한다.
function toDate(iso: string): Date {
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`)
}

export function formatDeadline(startAt: string, endAt: string): string {
  const start = toDate(startAt)
  const end = toDate(endAt)
  const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const days = Math.round((end.getTime() - start.getTime()) / 86400000)
  const duration = days >= 7 && days % 7 === 0 ? `${days / 7}주` : `${days}일`
  return `${dateStr(start)} ~ ${dateStr(end)} ${timeStr(end)} (${duration})`
}

export function isBeforeStart(startAt: string): boolean {
  return new Date() < toDate(startAt)
}

export function isPastDeadline(endAt: string): boolean {
  return new Date() > toDate(endAt)
}
