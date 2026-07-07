'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import type { Project, User } from '@/lib/types'

export default function NewProjectPage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const [form, setForm] = useState({
    title: '',
    description: '',
    generation: '',
    tech_stack: '',
    github_url: '',
    demo_url: '',
    thumbnail_url: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post<Project>('/api/projects', {
        title: form.title,
        description: form.description || null,
        generation: form.generation ? Number(form.generation) : null,
        tech_stack: form.tech_stack || null,
        github_url: form.github_url || null,
        demo_url: form.demo_url || null,
        thumbnail_url: form.thumbnail_url || null,
      })
      router.push('/projects')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const input = (
    k: keyof typeof form,
    placeholder: string,
    type = 'text'
  ) => (
    <input
      type={type}
      placeholder={placeholder}
      value={form[k]}
      onChange={(e) => set(k, e.target.value)}
      className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
    />
  )

  if (!user) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-gray-400">
        로그인이 필요합니다.
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">프로젝트 등록</h1>
      <form onSubmit={submit} className="space-y-3">
        {input('title', '프로젝트 이름')}
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="프로젝트 소개"
          rows={4}
          className="w-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#333] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
        />
        {input('generation', '기수 (숫자)', 'number')}
        {input('tech_stack', '기술스택 (쉼표로 구분, 예: React, FastAPI)')}
        {input('github_url', 'GitHub URL')}
        {input('demo_url', '데모 URL')}
        {input('thumbnail_url', '썸네일 이미지 URL')}
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => router.push('/projects')}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-800 dark:hover:text-white transition"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading || !form.title.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition"
          >
            {loading ? '등록 중...' : '등록'}
          </button>
        </div>
      </form>
    </div>
  )
}
