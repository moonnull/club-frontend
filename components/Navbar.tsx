'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
} from '@/lib/api/notifications'
import { clearAuth, getStoredUser } from '@/lib/session'
import { realtimeHub, type ConnectionStatus } from '@/lib/ws'
import { toDate } from '@/lib/formatDeadline'
import type { Notification, User } from '@/lib/types'
import { Bell, CalendarDays, ClipboardList, FileText, Layers, Megaphone, ShieldCheck, X } from 'lucide-react'
import ThemeToggle from './ThemeToggle'
import { errorMessage, useToast } from './Toast'

const NAV_LINKS = [
  { href: '/notices', label: '공지사항', Icon: Megaphone },
  { href: '/posts', label: '게시판', Icon: ClipboardList },
  { href: '/assignments', label: '과제', Icon: FileText },
  { href: '/tracks', label: '트랙', Icon: Layers },
  { href: '/calendar', label: '캘린더', Icon: CalendarDays },
]

export default function Navbar() {
  const toast = useToast()
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [unread, setUnread] = useState(0)
  const [wsStatus, setWsStatus] = useState<ConnectionStatus>('connecting')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUser(getStoredUser<User>())
  }, [pathname])

  useEffect(() => {
    function onAuthChanged() {
      setUser(getStoredUser<User>())
    }
    window.addEventListener('auth-changed', onAuthChanged)
    return () => window.removeEventListener('auth-changed', onAuthChanged)
  }, [])

  useEffect(() => {
    if (!user) {
      setUnread(0)
      return
    }
    // 초기값은 REST로 한 번 받아오고, 이후 갱신은 WebSocket 실시간 push로 처리한다.
    unreadCount()
      .then((r) => setUnread(r.count))
      .catch(() => {})

    const token = localStorage.getItem('token')
    if (!token) return
    realtimeHub.connect(token)
    const off = realtimeHub.on('unread_count', (data) => setUnread(data.unread_count))
    const offStatus = realtimeHub.onStatusChange(setWsStatus)
    return () => {
      off()
      offStatus()
      realtimeHub.disconnect()
    }
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

  async function removeNotification(n: Notification) {
    try {
      await deleteNotification(n.id)
      setNotifications((prev) => prev.filter((x) => x.id !== n.id))
      if (!n.is_read) setUnread((c) => Math.max(0, c - 1))
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  async function markAllRead() {
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnread(0)
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  function logout() {
    clearAuth()
    setUser(null)
    router.push('/login')
  }

  return (
    <nav className="h-14 sticky top-0 z-50 border-b border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-black/80 backdrop-blur-xl flex items-center px-6 gap-4">
      <Link
        href="/"
        className="font-black text-lg tracking-tight brand-text"
      >
        Chimera
      </Link>

      {NAV_LINKS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          // md 미만에서는 라벨이 display:none이라 접근성 트리에서 빠진다.
          aria-label={label}
          aria-current={pathname.startsWith(href) ? 'page' : undefined}
          className={`text-sm inline-flex items-center gap-1.5 transition ${
            pathname.startsWith(href)
              ? 'text-gray-900 dark:text-white font-medium'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Icon aria-hidden="true" className="size-4" />
          <span className="hidden md:inline">{label}</span>
        </Link>
      ))}
      {user?.role === 'ADMIN' && (
        <Link
          href="/admin"
          aria-label="관리자"
          aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
          className={`text-sm inline-flex items-center gap-1.5 transition ${
            pathname.startsWith('/admin')
              ? 'text-gray-900 dark:text-white font-medium'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck aria-hidden="true" className="size-4" />
          <span className="hidden md:inline">관리자</span>
        </Link>
      )}

      <div className="flex-1" />

      <ThemeToggle />

      {user && (
        <div ref={bellRef} className="relative">
          <button
            onClick={toggleDropdown}
            title={wsStatus === 'disconnected' ? '실시간 알림 연결이 끊겼습니다. 새로고침해보세요.' : undefined}
            aria-label={unread > 0 ? `알림 ${unread}개 (읽지 않음)` : '알림'}
            aria-expanded={open}
            aria-haspopup="true"
            className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <Bell aria-hidden="true" className="size-5 text-gray-500 dark:text-gray-400" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-medium leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
            {wsStatus === 'disconnected' && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 ring-2 ring-white dark:ring-black" />
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto panel rounded-xl shadow-xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">알림</span>
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
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
                      className={`group px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04] transition ${
                        !n.is_read ? 'bg-gray-50 dark:bg-white/[0.04]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-900 dark:bg-white shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-700 dark:text-gray-200 break-words">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {toDate(n.created_at).toLocaleString('ko')}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeNotification(n)
                          }}
                          className="shrink-0 hidden group-hover:inline text-gray-400 hover:text-red-500 transition"
                          title="알림 삭제"
                          aria-label="알림 삭제"
                        >
                          <X aria-hidden="true" className="size-3.5" />
                        </button>
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
          <Link
            href="/profile"
            className="text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition"
          >
            {user.name}
          </Link>
          {user.role === 'ADMIN' && (
            <span className="text-xs badge-neutral px-2 py-0.5 rounded-full font-medium">
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
            className="text-sm btn-primary px-3 py-1.5 rounded-lg font-medium"
          >
            회원가입
          </Link>
        </div>
      )}
    </nav>
  )
}
