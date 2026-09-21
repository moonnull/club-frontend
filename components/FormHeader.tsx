'use client'
import { X } from 'lucide-react'

/**
 * 글·공지·과제 작성/수정 화면의 공통 머리말.
 *
 * 여섯 화면이 같은 구조를 복사해 쓰면서 테두리와 버튼 스타일이 조금씩 어긋나
 * 있었다. 한곳으로 모아 통일한다.
 */
export default function FormHeader({
  heading,
  subtitle,
  onCancel,
  cancelLabel = '작성 취소',
}: {
  heading: string
  /** 제목 아래 한 줄 (예: 수정 화면에서 어느 게시판의 글인지) */
  subtitle?: React.ReactNode
  onCancel: () => void
  cancelLabel?: string
}) {
  return (
    <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-gray-200/60 dark:border-gray-800/60 shrink-0">
      <div>
        <h1 className="text-xl font-bold brand-text">{heading}</h1>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white panel rounded-lg px-3 py-1.5 transition"
      >
        <X aria-hidden="true" className="size-3.5" />
        {cancelLabel}
      </button>
    </div>
  )
}
