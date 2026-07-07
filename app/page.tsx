import Link from 'next/link'

const cards = [
  { href: '/posts', emoji: '📋', title: '게시판', desc: '공지 · 자유게시판 · Q&A · 모집' },
  { href: '/events', emoji: '📅', title: '일정 / 출석', desc: '정기모임 · 세미나 · 해커톤' },
  { href: '/projects', emoji: '🚀', title: '포트폴리오', desc: '우리가 함께 만든 프로젝트들' },
]

export default function HomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 text-center py-24">
      <h1 className="text-5xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
        Chimera
      </h1>
      <p className="text-gray-400 text-lg mb-14">함께 성장하는 보안 동아리</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="p-6 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-2xl hover:shadow-md dark:hover:border-gray-700 hover:border-indigo-300 transition group"
          >
            <div className="text-4xl mb-3">{c.emoji}</div>
            <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
              {c.title}
            </div>
            <div className="text-sm text-gray-400">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
