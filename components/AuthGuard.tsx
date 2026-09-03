'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getStoredUser } from '@/lib/session'
import type { User } from '@/lib/types'
import Navbar from './Navbar'

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password']
// 로그인 상태여도 계속 접근 가능해야 하는 경로 (다른 기기에서 온 재설정 링크 등)
const PUBLIC_EVEN_WHEN_LOGGED_IN = ['/forgot-password', '/reset-password']

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  // 인증 확인은 localStorage에 의존해서 클라이언트에서만 가능하다. 첫 확인이
  // 끝나기 전까지만 자리표시자를 보여주고, 이후 페이지 이동에서는 다시
  // 초기화하지 않는다. (매번 초기화하면 이동할 때마다 화면이 한 번 비어 보인다)
  const [checked, setChecked] = useState(false)

  const isPublic = PUBLIC_PATHS.includes(pathname)

  useEffect(() => {
    const user = getStoredUser<User>()

    if (!user && !isPublic) {
      router.replace('/login')
      return
    }
    if (user && isPublic && !PUBLIC_EVEN_WHEN_LOGGED_IN.includes(pathname)) {
      router.replace('/')
      return
    }
    setChecked(true)
  }, [pathname, isPublic, router])

  if (!checked) {
    // 빈 화면 대신 최소한의 자리표시자. 배경색이 이미 잡혀 있어 깜빡임이 없다.
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        role="status"
        aria-label="불러오는 중"
      >
        <span className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-700 border-t-gray-900 dark:border-t-white animate-spin" />
      </div>
    )
  }

  // 로그인/회원가입 화면은 네비게이션 없이 단독으로 보여준다.
  if (isPublic) return <>{children}</>

  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
