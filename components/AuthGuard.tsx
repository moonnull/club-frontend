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
  const [ready, setReady] = useState(false)

  const isPublic = PUBLIC_PATHS.includes(pathname)

  useEffect(() => {
    setReady(false)
    const user = getStoredUser<User>()

    if (!user && !isPublic) {
      router.replace('/login')
      return
    }
    if (user && isPublic && !PUBLIC_EVEN_WHEN_LOGGED_IN.includes(pathname)) {
      router.replace('/')
      return
    }
    setReady(true)
  }, [pathname, isPublic, router])

  if (!ready) return null

  // 로그인/회원가입 화면은 네비게이션 없이 단독으로 보여준다.
  if (isPublic) return <>{children}</>

  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
