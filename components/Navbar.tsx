'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { clearAuth, getStoredUser } from '@/lib/api'
import type { User } from '@/lib/types'

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
    router.push('/')
  }

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-3 py-1 rounded text-sm transition ${
        pathname.startsWith(href)
          ? 'bg-white/30 font-semibold'
          : 'hover:bg-white/20'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="bg-indigo-700 text-white shadow">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight">
          Chimera
        </Link>
        <div className="flex items-center gap-2">
          {navLink('/posts', '게시판')}
          {navLink('/events', '일정')}
          {navLink('/projects', '포트폴리오')}
        </div>
        <div className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <span className="opacity-80">{user.name}</span>
              {user.role === 'ADMIN' && (
                <span className="bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full font-medium">
                  관리자
                </span>
              )}
              <button
                onClick={logout}
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="bg-white text-indigo-700 hover:bg-indigo-50 px-3 py-1 rounded font-medium transition"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
