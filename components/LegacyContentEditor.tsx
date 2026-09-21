'use client'
import { useRef } from 'react'
import ImageInsertButton from '@/components/ImageInsertButton'

/**
 * 리치 텍스트 도입 이전에 작성된 글(일반 텍스트 + 이미지 토큰)을 수정하는 편집기.
 *
 * 게시글과 공지 수정 화면이 이 로직을 그대로 복사해 쓰고 있었다. 커서 위치에
 * 토큰을 끼워 넣는 부분까지 두 곳에서 똑같이 유지해야 했다.
 */
export default function LegacyContentEditor({
  content,
  onChange,
  className,
  placeholder = '내용을 입력하세요',
}: {
  content: string
  onChange: (next: string) => void
  /** 게시글과 공지의 입력란 스타일이 달라 호출 측에서 넘긴다. */
  className: string
  placeholder?: string
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function insertImage(url: string) {
    const snippet = `![image](${url})`
    const el = textareaRef.current
    if (!el) {
      onChange(`${content}\n${snippet}\n`)
      return
    }
    const start = el.selectionStart ?? content.length
    const end = el.selectionEnd ?? content.length
    onChange(content.slice(0, start) + `\n${snippet}\n` + content.slice(end))
  }

  return (
    <>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className={className}
      />
      <div className="shrink-0">
        <ImageInsertButton onUploaded={insertImage} />
      </div>
    </>
  )
}
