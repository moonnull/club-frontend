import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import AuthGuard from '@/components/AuthGuard'
import ToastProvider from '@/components/Toast'
import ConfirmProvider from '@/components/ConfirmDialog'

const inter = Inter({ subsets: ['latin'] })

const SITE_NAME = 'Chimera 동아리'
const SITE_DESCRIPTION = '함께 성장하는 보안 동아리 Chimera의 공식 웹사이트'

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: 'ko_KR',
  },
  twitter: { card: 'summary', title: SITE_NAME, description: SITE_DESCRIPTION },
  // 로그인해야 볼 수 있는 내부용 사이트라 검색엔진 색인은 막는다.
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 라이트/다크 각각의 브라우저 UI 색. 모바일 주소창까지 배경과 이어지게 한다.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 다크모드 깜빡임 방지 — 렌더 전에 클래스 적용 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme'),d=window.matchMedia('(prefers-color-scheme: dark)').matches,isDark=t==='dark'||(!t&&d);if(isDark)document.documentElement.classList.add('dark');document.documentElement.style.colorScheme=isDark?'dark':'light'}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-white dark:bg-black text-gray-900 dark:text-gray-100`}>
        <ToastProvider>
          <ConfirmProvider>
            <AuthGuard>{children}</AuthGuard>
          </ConfirmProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
