import Link from 'next/link'

const cards = [
  {
    href: '/posts',
    emoji: '📋',
    title: '게시판',
    desc: '공지 · 자유게시판 · Q&A · 모집',
  },
  {
    href: '/events',
    emoji: '📅',
    title: '일정 / 출석',
    desc: '정기모임 · 세미나 · 해커톤',
  },
  {
    href: '/projects',
    emoji: '🚀',
    title: '포트폴리오',
    desc: '우리가 함께 만든 프로젝트들',
  },
]

export default function HomePage() {
  return (
    <div className="text-center py-20">
      <h1 className="text-5xl font-bold text-indigo-700 mb-3">Chimera</h1>
      <p className="text-gray-400 text-lg mb-12">함께 성장하는 개발 동아리</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-2xl mx-auto">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300 transition"
          >
            <div className="text-4xl mb-3">{c.emoji}</div>
            <div className="font-semibold text-gray-800 mb-1">{c.title}</div>
            <div className="text-sm text-gray-400">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
