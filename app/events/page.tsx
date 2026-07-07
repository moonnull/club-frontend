'use client'
import { useEffect, useState } from 'react'
import { checkIn as apiCheckIn, listEvents, myAttendanceStats } from '@/lib/api/events'
import { getStoredUser } from '@/lib/session'
import type { AttendanceStats, Event, User } from '@/lib/types'

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [upcomingOnly, setUpcomingOnly] = useState(false)
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [checkedIds, setCheckedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const user = getStoredUser<User>()

  useEffect(() => {
    setLoading(true)
    Promise.all([
      listEvents(upcomingOnly),
      user ? myAttendanceStats() : Promise.resolve(null),
    ])
      .then(([ev, st]) => { setEvents(ev); setStats(st) })
      .finally(() => setLoading(false))
  }, [upcomingOnly])

  async function checkIn(eventId: number) {
    try {
      await apiCheckIn(eventId)
      setCheckedIds((p) => [...p, eventId])
      setStats((s) =>
        s ? {
          ...s,
          attended_events: s.attended_events + 1,
          attendance_rate: Math.round(((s.attended_events + 1) / s.total_events) * 1000) / 10,
        } : s
      )
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">일정</h1>
        {user && stats && (
          <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl px-5 py-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">내 출석률 </span>
            <span className="font-bold text-indigo-700 dark:text-indigo-400 text-lg">
              {stats.attendance_rate}%
            </span>
            <span className="text-gray-400 ml-1.5">
              ({stats.attended_events}/{stats.total_events})
            </span>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 mb-5 text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={upcomingOnly}
          onChange={(e) => setUpcomingOnly(e.target.checked)}
          className="rounded"
        />
        예정된 일정만 보기
      </label>

      {loading ? (
        <p className="text-center text-gray-400 py-12 text-sm">불러오는 중...</p>
      ) : events.length === 0 ? (
        <p className="text-center text-gray-400 py-12 text-sm">등록된 일정이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => {
            const date = new Date(ev.event_date)
            const isPast = date < new Date()
            const attended = checkedIds.includes(ev.id)
            return (
              <div
                key={ev.id}
                className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5 flex gap-4 items-start"
              >
                <div className="text-center bg-indigo-50 dark:bg-indigo-500/10 rounded-lg px-4 py-2 shrink-0 min-w-[52px]">
                  <p className="text-[11px] text-indigo-400 font-medium">
                    {date.toLocaleDateString('ko', { month: 'short' })}
                  </p>
                  <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 leading-none">
                    {date.getDate()}
                  </p>
                  <p className="text-[11px] text-indigo-400">
                    {date.toLocaleDateString('ko', { weekday: 'short' })}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{ev.title}</p>
                  {ev.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {ev.description}
                    </p>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    {ev.location && <span>📍 {ev.location}</span>}
                    <span>
                      {date.toLocaleTimeString('ko', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                {user && !isPast ? (
                  <button
                    onClick={() => checkIn(ev.id)}
                    disabled={attended}
                    className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
                      attended
                        ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {attended ? '✓ 출석 완료' : '출석 체크'}
                  </button>
                ) : isPast ? (
                  <span className="shrink-0 text-xs text-gray-300 dark:text-gray-600 self-center">
                    종료
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
