import Link from 'next/link'
import GradientBackground from '@/components/GradientBackground'

const cards = [
  { href: '/posts', emoji: '📋', title: '게시판', desc: '공지 · 자유게시판 · Q&A · 모집' },
]

export default function HomePage() {
  return (
    <div className="relative max-w-5xl mx-auto px-4 text-center py-24">
      <GradientBackground />
      <h1 className="text-5xl font-black gradient-text mb-3 tracking-tight">
        Chimera
      </h1>
      <p className="text-gray-500 dark:text-gray-400 text-lg mb-14">함께 성장하는 보안 동아리</p>
      <div className="grid grid-cols-1 gap-4 max-w-xs mx-auto">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="p-6 glass-panel rounded-2xl hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-300/60 dark:hover:border-purple-400/30 transition group"
          >
            <div className="text-4xl mb-3">{c.emoji}</div>
            <div className="font-semibold text-gray-800 dark:text-gray-100 mb-1 group-hover:gradient-text transition">
              {c.title}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
