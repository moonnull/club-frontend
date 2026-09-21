'use client'
import { isNotFound } from '@/lib/api/client'
import { errorMessage } from '@/components/Toast'

/**
 * 화면에 들어올 때의 불러오기가 실패했음을 알리는 상태 표시.
 *
 * 실패를 전부 "찾을 수 없습니다"로 안내하면, 서버가 잠깐 죽었거나 네트워크가
 * 끊긴 것뿐인데도 사용자는 글이 지워진 줄 알고 떠난다. 실제로 대상이 없을
 * 때(404)만 그렇게 말하고, 나머지는 원인을 그대로 보여주고 다시 시도할 길을
 * 남긴다. (없는 글에 "다시 시도"를 붙이는 건 아무 의미가 없으므로 그때는 뺀다.)
 */
export default function LoadFailure({
  error,
  notFoundText,
  className = 'h-[calc(100vh-56px)]',
}: {
  error: unknown
  /** 대상이 실제로 없을 때의 문구. 예: '공지사항을 찾을 수 없습니다.' */
  notFoundText: string
  className?: string
}) {
  const missing = isNotFound(error)

  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-4 ${className}`}>
      <p className="text-sm text-gray-400 text-center break-keep">
        {missing ? notFoundText : errorMessage(error, '불러오지 못했습니다.')}
      </p>
      {!missing && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition"
        >
          다시 시도
        </button>
      )}
    </div>
  )
}
