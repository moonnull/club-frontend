'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { listAssignments } from '@/lib/api/assignments'
import {
  createCalendarItem,
  deleteCalendarItem,
  listCalendarItems,
  updateCalendarItem,
} from '@/lib/api/calendar'
import { getStoredUser } from '@/lib/session'
import { toDate } from '@/lib/formatDeadline'
import GradientBackground from '@/components/GradientBackground'
import type { AssignmentListItem, CalendarItem, User } from '@/lib/types'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MAX_DOTS = 4

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

function dateKeyFromDate(d: Date): string {
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate())
}

function formatSelectedDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('ko', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  })
}

export default function CalendarPage() {
  const user = getStoredUser<User>()
  const today = new Date()
  const todayKey = dateKeyFromDate(today)

  function defaultSelected(y: number, m: number): string {
    return y === today.getFullYear() && m === today.getMonth() ? todayKey : dateKey(y, m, 1)
  }

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(defaultSelected(today.getFullYear(), today.getMonth()))
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([])
  const [items, setItems] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const lastDay = new Date(year, month + 1, 0).getDate()
  const monthStart = `${year}-${pad(month + 1)}-01`
  const monthEnd = `${year}-${pad(month + 1)}-${pad(lastDay)}`

  useEffect(() => {
    setLoading(true)
    Promise.all([listAssignments(), listCalendarItems(monthStart, monthEnd)])
      .then(([asg, cal]) => {
        setAssignments(asg)
        setItems(cal)
      })
      .finally(() => setLoading(false))
  }, [year, month])

  const assignmentsByDay = useMemo(() => {
    const map: Record<string, AssignmentListItem[]> = {}
    for (const a of assignments) {
      const key = dateKeyFromDate(toDate(a.end_at))
      ;(map[key] ??= []).push(a)
    }
    return map
  }, [assignments])

  const itemsByDay = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {}
    for (const it of items) {
      ;(map[it.item_date] ??= []).push(it)
    }
    return map
  }, [items])

  function prevMonth() {
    const y = month === 0 ? year - 1 : year
    const m = month === 0 ? 11 : month - 1
    setYear(y)
    setMonth(m)
    setSelectedDate(defaultSelected(y, m))
  }

  function nextMonth() {
    const y = month === 11 ? year + 1 : year
    const m = month === 11 ? 0 : month + 1
    setYear(y)
    setMonth(m)
    setSelectedDate(defaultSelected(y, m))
  }

  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDate(todayKey)
  }

  async function submitNewItem() {
    if (creating || !newTitle.trim()) return
    setCreating(true)
    try {
      const item = await createCalendarItem({ title: newTitle.trim(), item_date: selectedDate })
      setItems((prev) => [...prev, item])
      setNewTitle('')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setCreating(false)
    }
  }

  async function toggleDone(item: CalendarItem) {
    try {
      const updated = await updateCalendarItem(item.id, { is_done: !item.is_done })
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  async function removeItem(item: CalendarItem) {
    if (!confirm('삭제하시겠습니까?')) return
    try {
      await deleteCalendarItem(item.id)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  const firstWeekday = new Date(year, month, 1).getDay()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedAssignments = assignmentsByDay[selectedDate] ?? []
  const selectedItems = itemsByDay[selectedDate] ?? []

  return (
    <div className="relative max-w-5xl mx-auto px-4 py-8">
      <GradientBackground />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black gradient-text tracking-tight">캘린더</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition px-2 text-lg"
          >
            ‹
          </button>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 min-w-[92px] text-center">
            {year}년 {month + 1}월
          </span>
          <button
            onClick={nextMonth}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition px-2 text-lg"
          >
            ›
          </button>
          <button
            onClick={goToday}
            className="text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            오늘
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 py-12 text-sm">불러오는 중...</p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* ── 월간 그리드 ── */}
          <div className="flex-1 w-full glass-panel rounded-2xl p-3">
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((w) => (
                <div key={w} className="text-center text-xs font-semibold text-gray-400 py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (day === null) return <div key={idx} className="min-h-[80px]" />

                const key = dateKey(year, month, day)
                const isToday = key === todayKey
                const isSelected = key === selectedDate
                const dayAssignments = assignmentsByDay[key] ?? []
                const dayItems = itemsByDay[key] ?? []
                const total = dayAssignments.length + dayItems.length
                let shown = 0
                const dots: React.ReactNode[] = []
                for (let i = 0; i < dayAssignments.length && shown < MAX_DOTS; i++, shown++) {
                  dots.push(<span key={`a${i}`} className="w-1.5 h-1.5 rounded-full bg-red-400" />)
                }
                for (let i = 0; i < dayItems.length && shown < MAX_DOTS; i++, shown++) {
                  dots.push(<span key={`i${i}`} className="w-1.5 h-1.5 rounded-full bg-indigo-400" />)
                }
                const remaining = total - shown

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(key)}
                    className={`min-h-[80px] rounded-xl p-1.5 cursor-pointer transition ${
                      isSelected
                        ? 'ring-2 ring-indigo-400 bg-white/50 dark:bg-white/5'
                        : 'hover:bg-white/40 dark:hover:bg-white/5'
                    }`}
                  >
                    <span
                      className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {day}
                    </span>
                    {total > 0 && (
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap px-0.5">
                        {dots}
                        {remaining > 0 && <span className="text-[10px] text-gray-400">+{remaining}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── 오른쪽 패널: 선택한 날짜의 일정 ── */}
          <aside className="w-full lg:w-80 shrink-0 glass-panel rounded-2xl p-4 flex flex-col min-h-[300px]">
            <h2 className="text-sm font-semibold gradient-text mb-3">{formatSelectedDate(selectedDate)}</h2>

            {selectedAssignments.length === 0 && selectedItems.length === 0 && (
              <p className="text-sm text-gray-400">일정이 없습니다.</p>
            )}

            {selectedAssignments.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {selectedAssignments.map((a) => (
                  <Link
                    key={a.id}
                    href={`/assignments/${a.id}`}
                    className="block text-sm px-3 py-2 rounded-lg bg-red-500/10 text-red-500 hover:underline"
                  >
                    마감 · {a.title}
                  </Link>
                ))}
              </div>
            )}

            {selectedItems.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {selectedItems.map((it) => (
                  <div
                    key={it.id}
                    className="group flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={it.is_done}
                      onChange={() => toggleDone(it)}
                      className="shrink-0 h-3.5 w-3.5"
                    />
                    <span
                      className={`truncate flex-1 ${
                        it.is_done ? 'line-through text-gray-400' : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {it.title}
                    </span>
                    {user && (user.id === it.author.id || user.role === 'ADMIN') && (
                      <button
                        onClick={() => removeItem(it)}
                        className="shrink-0 hidden group-hover:inline text-gray-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-auto pt-3 border-t border-gray-200/60 dark:border-gray-800/60">
              {user ? (
                <div className="flex items-center gap-2">
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitNewItem()
                    }}
                    disabled={creating}
                    placeholder="할 일 추가..."
                    className="flex-1 text-sm bg-white/70 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60 placeholder-gray-400 dark:placeholder-gray-600"
                  />
                  <button
                    onClick={submitNewItem}
                    disabled={creating || !newTitle.trim()}
                    className="gradient-btn text-sm rounded-lg px-3 py-1.5 disabled:opacity-40"
                  >
                    추가
                  </button>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center">
                  로그인하면 캘린더에 메모/할 일을 추가할 수 있습니다.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
