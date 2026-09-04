import Link from 'next/link'
import { CalendarDays, ClipboardList, FileText, Layers, Megaphone } from 'lucide-react'

const cards = [
  { href: '/notices', Icon: Megaphone, title: '공지사항', desc: '동아리 전체 · 트랙별 공지' },
  { href: '/posts', Icon: ClipboardList, title: '게시판', desc: '자유게시판 · Q&A · 모집' },
  { href: '/assignments', Icon: FileText, title: '과제', desc: '주차별 과제 제출과 피드백' },
  { href: '/tracks', Icon: Layers, title: '트랙', desc: '과정별 커리큘럼 한눈에 보기' },
  { href: '/calendar', Icon: CalendarDays, title: '캘린더', desc: '일정과 마감 관리' },
]

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 text-center py-24">
      <h1 className="text-5xl font-black brand-text mb-3 tracking-tight">Chimera</h1>
      <p className="text-gray-500 dark:text-gray-400 text-lg mb-14">함께 성장하는 보안 동아리</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
        {cards.map(({ href, Icon, title, desc }) => (
          <Link
            key={href}
            href={href}
            className="p-5 panel rounded-2xl hover:border-gray-400 dark:hover:border-gray-600 transition group"
          >
            <Icon aria-hidden="true" className="size-6 mb-3 text-gray-900 dark:text-white" />
            <div className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:underline">
              {title}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
