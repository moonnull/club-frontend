'use client'
import { useEffect } from 'react'

// 루트 레이아웃 자체가 깨졌을 때만 동작하는 최후의 안전망. 이 파일은
// 루트 레이아웃을 완전히 대체하므로 <html>/<body>를 직접 그려야 한다.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="ko">
      <body className="bg-white dark:bg-[#0d0d0d] text-gray-900 dark:text-gray-100">
        <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <h1 className="text-lg font-bold mb-1">문제가 발생했습니다</h1>
          <p className="text-sm text-gray-400 mb-6">
            페이지를 불러오는 중 오류가 발생했습니다. 다시 시도해도 계속되면 관리자에게 알려주세요.
          </p>
          <button
            onClick={reset}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
