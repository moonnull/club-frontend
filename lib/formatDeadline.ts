function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatDeadline(startAt: string, endAt: string): string {
  const start = new Date(startAt)
  const end = new Date(endAt)
  const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const timeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const days = Math.round((end.getTime() - start.getTime()) / 86400000)
  const duration = days >= 7 && days % 7 === 0 ? `${days / 7}주` : `${days}일`
  return `${dateStr(start)} ~ ${dateStr(end)} ${timeStr(end)} (${duration})`
}

export function isBeforeStart(startAt: string): boolean {
  return new Date() < new Date(startAt)
}

export function isPastDeadline(endAt: string): boolean {
  return new Date() > new Date(endAt)
}
