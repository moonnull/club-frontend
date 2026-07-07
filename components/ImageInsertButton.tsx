'use client'
import { useRef, useState } from 'react'
import { api } from '@/lib/api'
import type { UploadResult } from '@/lib/types'

export default function ImageInsertButton({
  onUploaded,
}: {
  onUploaded: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(files: FileList | null) {
    const file = files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const result = await api.upload<UploadResult>('/api/uploads', file)
      onUploaded(result.url)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-xs text-gray-400 hover:text-indigo-500 transition disabled:opacity-50"
      >
        🖼️ {uploading ? '업로드 중...' : '이미지 삽입'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.gif,.webp"
        hidden
        onChange={(e) => handleFile(e.target.files)}
      />
    </>
  )
}
