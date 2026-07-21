'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { listNotifications, markAllNotificationsRead, markNotificationRead, unreadCount } from '@/lib/api/notifications'
import { clearAuth, getStoredUser } from '@/lib/session'
import type { Notification, User } from '@/lib/types'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [unread, setUnread] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUser(getStoredUser<User>())
  }, [pathname])

  useEffect(() => {
    if (!user) {
      setUnread(0)
      return
    }
    function refreshUnread() {
      unreadCount()
        .then((r) => setUnread(r.count))
        .catch(() => {})
    }
    refreshUnread()
    const interval = setInterval(refreshUnread, 60000)
    return () => clearInterval(interval)
  }, [user?.id])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function toggleDropdown() {
    const next = !open
    setOpen(next)
    if (next) {
      listNotifications()
        .then(setNotifications)
        .catch(() => {})
    }
  }

  async function openNotification(n: Notification) {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id)
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
        setUnread((c) => Math.max(0, c - 1))
      } catch {
        // 읽음 처리 실패해도 이동은 계속 진행
      }
    }
    setOpen(false)
    if (n.link) router.push(n.link)
  }

  async function markAllRead() {
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnread(0)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  function logout() {
    clearAuth()
    setUser(null)
    router.push('/login')
  }

  return (
    <nav className="h-14 sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111] flex items-center px-6 gap-4">
      <Link
        href="/"
        className="font-black text-lg tracking-tight text-gray-900 dark:text-white"
      >
        Chimera
      </Link>

      <Link
        href="/notices"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        공지사항
      </Link>
      <Link
        href="/posts"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        게시판
      </Link>
      <Link
        href="/assignments"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        과제
      </Link>
      <Link
        href="/calendar"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        캘린더
      </Link>
      {user?.role === 'ADMIN' && (
        <Link
          href="/admin"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
        >
          관리자
        </Link>
      )}

      <div className="flex-1" />

      <ThemeToggle />

      {user && (
        <div ref={bellRef} className="relative">
          <button
            onClick={toggleDropdown}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <span className="text-gray-500 dark:text-gray-400 text-base">🔔</span>
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-medium leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl shadow-lg">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">알림</span>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-indigo-500 hover:text-indigo-600 transition"
                  >
                    모두 읽음
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">알림이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#151515] transition ${
                        !n.is_read ? 'bg-indigo-50/50 dark:bg-indigo-500/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-700 dark:text-gray-200 break-words">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(n.created_at).toLocaleString('ko')}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {user ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {user.name}
          </span>
          {user.role === 'ADMIN' && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
              관리자
            </span>
          )}
          <button
            onClick={logout}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
          >
            로그아웃
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1.5 rounded-lg font-medium hover:opacity-90 transition"
          >
            회원가입
          </Link>
        </div>
      )}
    </nav>
  )
}
