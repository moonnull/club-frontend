'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'

export default function ErrorPage({
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
    <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] px-4 text-center">
      <TriangleAlert aria-hidden="true" className="size-10 mb-3 text-gray-400" />
      <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-1">문제가 발생했습니다</h1>
      <p className="text-sm text-gray-400 mb-6">
        예상치 못한 오류가 발생했습니다. 다시 시도해도 계속되면 관리자에게 알려주세요.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          className="btn-primary px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 transition"
        >
          홈으로
        </Link>
      </div>
    </div>
  )
}
