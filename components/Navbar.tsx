'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { clearAuth, getStoredUser } from '@/lib/session'
import type { User } from '@/lib/types'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setUser(getStoredUser<User>())
  }, [pathname])

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
        href="/events"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        일정
      </Link>
      <Link
        href="/projects"
        className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        포트폴리오
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

      <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
        <span className="text-gray-500 dark:text-gray-400 text-base">🔔</span>
      </button>

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
