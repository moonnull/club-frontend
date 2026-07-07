'use client'
import { useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { UploadResult } from '@/lib/types'

const ACCEPT = '.pdf,.zip,.jpg,.jpeg,.png,.gif,.webp'

export default function AttachmentPicker({
  value,
  onChange,
}: {
  value: UploadResult[]
  onChange: (files: UploadResult[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError('')
    setUploading(true)
    try {
      const uploaded = await Promise.all(
        Array.from(files).map((f) => api.upload<UploadResult>('/api/uploads', f))
      )
      onChange([...value, ...uploaded])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '파일 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
        >
          📎 {uploading ? '업로드 중...' : '파일 첨부'}
        </button>
        <span className="text-xs text-gray-400">pdf, zip, 이미지 파일만 가능합니다.</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="text-red-500 text-xs mt-1.5">{error}</p>}
      {value.length > 0 && (
        <ul className="mt-2 space-y-1">
          {value.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between text-sm bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-lg px-3 py-1.5"
            >
              <span className="truncate text-gray-700 dark:text-gray-300">{f.filename}</span>
              <button
                type="button"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-red-500 shrink-0 ml-2"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
