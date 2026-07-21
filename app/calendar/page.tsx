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
import type { AssignmentListItem, CalendarItem, User } from '@/lib/types'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function dateKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}

function dateKeyFromDate(d: Date): string {
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function CalendarPage() {
  const user = getStoredUser<User>()
  const today = new Date()

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [assignments, setAssignments] = useState<AssignmentListItem[]>([])
  const [items, setItems] = useState<CalendarItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const lastDay = new Date(year, month + 1, 0).getDate()
  const monthStart = `${year}-${pad(month + 1)}-01`
  const monthEnd = `${year}-${pad(month + 1)}-${pad(lastDay)}`

  useEffect(() => {
    setLoading(true)
    setEditingDate(null)
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
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else {
      setMonth((m) => m - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else {
      setMonth((m) => m + 1)
    }
  }

  function goToday() {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
  }

  async function submitNewItem(key: string) {
    if (creating) return
    if (!newTitle.trim()) {
      setEditingDate(null)
      setNewTitle('')
      return
    }
    setCreating(true)
    try {
      const item = await createCalendarItem({ title: newTitle.trim(), item_date: key })
      setItems((prev) => [...prev, item])
      setNewTitle('')
      setEditingDate(null)
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

  const todayKey = dateKeyFromDate(today)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">캘린더</h1>
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
        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-xs font-semibold text-gray-400 py-2">
                {w}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (day === null) {
                return (
                  <div key={idx} className="min-h-[110px] border-b border-r border-gray-100 dark:border-gray-800/60" />
                )
              }
              const key = dateKey(year, month, day)
              const isToday = key === todayKey
              const dayAssignments = assignmentsByDay[key] ?? []
              const dayItems = itemsByDay[key] ?? []
              return (
                <div
                  key={idx}
                  onClick={() => user && editingDate !== key && setEditingDate(key)}
                  className={`min-h-[110px] border-b border-r border-gray-100 dark:border-gray-800/60 p-1.5 transition ${
                    user ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#151515]' : ''
                  }`}
                >
                  <span
                    className={`text-xs font-medium inline-flex items-center justify-center ${
                      isToday
                        ? 'bg-indigo-600 text-white rounded-full w-5 h-5'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayAssignments.map((a) => (
                      <Link
                        key={`asg-${a.id}`}
                        href={`/assignments/${a.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate text-[11px] px-1 py-0.5 rounded bg-red-500/15 text-red-500 hover:underline"
                      >
                        마감 {a.title}
                      </Link>
                    ))}
                    {dayItems.map((it) => (
                      <div
                        key={`item-${it.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="group flex items-center gap-1 text-[11px] px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
                      >
                        <input
                          type="checkbox"
                          checked={it.is_done}
                          onChange={() => toggleDone(it)}
                          className="shrink-0 h-3 w-3"
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
                    {editingDate === key && (
                      <input
                        autoFocus
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitNewItem(key)
                          if (e.key === 'Escape') {
                            setEditingDate(null)
                            setNewTitle('')
                          }
                        }}
                        onBlur={() => submitNewItem(key)}
                        disabled={creating}
                        placeholder="할 일 추가..."
                        className="w-full text-[11px] bg-white dark:bg-[#0f0f0f] border border-indigo-300 dark:border-indigo-500/50 rounded px-1 py-0.5 focus:outline-none disabled:opacity-60"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!user && (
        <p className="text-xs text-gray-400 mt-3 text-center">로그인하면 캘린더에 메모/할 일을 추가할 수 있습니다.</p>
      )}
    </div>
  )
}
