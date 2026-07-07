'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { listAssignments } from '@/lib/api/assignments'
import { getStoredUser } from '@/lib/session'
import type { User } from '@/lib/types'

export default function AssignmentsIndexPage() {
  const router = useRouter()
  const user = getStoredUser<User>()
  const [checked, setChecked] = useState(false)
  const [hasAssignments, setHasAssignments] = useState(false)

  useEffect(() => {
    listAssignments().then((list) => {
      if (list.length > 0) {
        router.replace(`/assignments/${list[0].id}`)
      } else {
        setHasAssignments(false)
        setChecked(true)
      }
    })
  }, [])

  if (!checked) {
    return <div className="flex items-center justify-center h-full text-sm text-gray-400">불러오는 중...</div>
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-sm text-gray-400 gap-3">
      <p>{hasAssignments ? '왼쪽 목록에서 과제를 선택하세요.' : '등록된 과제가 없습니다.'}</p>
      {user?.role === 'ADMIN' && (
        <button
          onClick={() => router.push('/assignments/new')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          + 과제 등록
        </button>
      )}
    </div>
  )
}
