'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import AttachmentPicker from '@/components/AttachmentPicker'
import ImageInsertButton from '@/components/ImageInsertButton'
import type { BoardCategory, Post, UploadResult, User } from '@/lib/types'

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const user = getStoredUser<User>()
  const [post, setPost] = useState<Post | null>(null)
  const [boardMap, setBoardMap] = useState<Record<string, string>>({})
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<UploadResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    api.get<BoardCategory[]>('/api/boards').then((boards) =>
      setBoardMap(Object.fromEntries(boards.map((b) => [b.key, b.name])))
    )
    api
      .get<Post>(`/api/posts/${id}`)
      .then((p) => {
        setPost(p)
        setTitle(p.title)
        setContent(p.content)
        setAttachments(p.attachments ?? [])
      })
      .catch(() => setNotFound(true))
  }, [id])

  function insertImage(url: string) {
    const snippet = `![image](${url})`
    const el = textareaRef.current
    if (!el) {
      setContent((c) => `${c}\n${snippet}\n`)
      return
    }
    const start = el.selectionStart ?? content.length
    const end = el.selectionEnd ?? content.length
    setContent(content.slice(0, start) + `\n${snippet}\n` + content.slice(end))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.put(`/api/posts/${id}`, { title, content, attachments })
      router.push(`/posts/${id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (notFound) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-sm text-gray-400">
        게시글을 찾을 수 없습니다.
      </div>
    )
  }

  if (!post || !user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-sm text-gray-400">
        불러오는 중...
      </div>
    )
  }

  const canEdit = user.id === post.author.id || user.role === 'ADMIN'
  if (!canEdit) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)] text-sm text-gray-400">
        수정 권한이 없습니다.
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">게시글 수정</h1>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-gray-400">
          게시판: <span className="text-gray-600 dark:text-gray-300">{boardMap[post.board_type] ?? post.board_type}</span>
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          required
          className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
        <div>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="내용을 입력하세요"
            required
            rows={12}
            className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
          <div className="mt-1.5">
            <ImageInsertButton onUploaded={insertImage} />
          </div>
        </div>
        <AttachmentPicker value={attachments} onChange={setAttachments} />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push(`/posts/${id}`)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-white transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  )
}
