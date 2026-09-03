import Link from 'next/link'

const cards = [
  { href: '/posts', emoji: '📋', title: '게시판', desc: '공지 · 자유게시판 · Q&A · 모집' },
]

export default function HomePage() {
  return (
    <div className="relative max-w-5xl mx-auto px-4 text-center py-24">
      <h1 className="text-5xl font-black brand-text mb-3 tracking-tight">
        Chimera
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-lg mb-14">함께 성장하는 보안 동아리</p>
      <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="p-6 panel rounded-2xl hover:border-gray-400 dark:hover:border-gray-600 transition group"
          >
            <div aria-hidden="true" className="text-4xl mb-3">{c.emoji}</div>
            <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1 group-hover:underline transition">
              {c.title}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
