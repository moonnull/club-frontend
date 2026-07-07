'use client'
import { useEffect, useState } from 'react'
import { api, getStoredUser } from '@/lib/api'
import type { Project, User } from '@/lib/types'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [generation, setGeneration] = useState('')
  const [tech, setTech] = useState('')
  const [techInput, setTechInput] = useState('')
  const [loading, setLoading] = useState(true)
  const user = getStoredUser<User>()

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (generation) params.set('generation', generation)
    if (tech) params.set('tech', tech)
    api
      .get<Project[]>(`/api/projects?${params}`)
      .then(setProjects)
      .finally(() => setLoading(false))
  }, [generation, tech])

  const generations = Array.from(
    new Set(projects.map((p) => p.generation).filter(Boolean))
  ).sort((a, b) => (b ?? 0) - (a ?? 0))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">포트폴리오</h1>
        {user && (
          <a
            href="/projects/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            프로젝트 등록
          </a>
        )}
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <select
          value={generation}
          onChange={(e) => setGeneration(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          <option value="">전체 기수</option>
          {generations.map((g) => (
            <option key={g} value={g!}>
              {g}기
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          <input
            value={techInput}
            onChange={(e) => setTechInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setTech(techInput)}
            placeholder="기술스택 검색"
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={() => setTech(techInput)}
            className="bg-gray-700 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-gray-800 transition"
          >
            검색
          </button>
          {tech && (
            <button
              onClick={() => { setTech(''); setTechInput('') }}
              className="text-sm text-gray-400 hover:text-gray-600 px-2"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-12">불러오는 중...</p>
      ) : projects.length === 0 ? (
        <p className="text-gray-400 text-center py-12">등록된 프로젝트가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white border rounded-xl p-5 hover:shadow-md transition flex flex-col"
            >
              {p.thumbnail_url && (
                <img
                  src={p.thumbnail_url}
                  alt={p.title}
                  className="w-full h-36 object-cover rounded-lg mb-3"
                />
              )}
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-800">{p.title}</h3>
                {p.generation && (
                  <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                    {p.generation}기
                  </span>
                )}
              </div>
              {p.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{p.description}</p>
              )}
              {p.tech_stack && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.tech_stack.split(',').map((t) => (
                    <span
                      key={t}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                    >
                      {t.trim()}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex gap-2 text-xs">
                {p.github_url && (
                  <a
                    href={p.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-gray-800 hover:underline"
                  >
                    GitHub
                  </a>
                )}
                {p.demo_url && (
                  <a
                    href={p.demo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline"
                  >
                    데모 보기
                  </a>
                )}
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {p.members.map((m) => m.user.name).join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
