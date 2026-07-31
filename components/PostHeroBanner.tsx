import { boardColor } from '@/lib/boardColor'

export default function PostHeroBanner({
  boardName,
  boardKey,
  title,
}: {
  boardName: string
  boardKey: string
  title: string
}) {
  const { gradient } = boardColor(boardKey)
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} h-56 sm:h-64 flex items-end p-6 sm:p-8`}
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-16 -right-10 w-72 h-72 rounded-full bg-white/15 blur-[80px]" />
        <div className="absolute -bottom-20 -left-16 w-72 h-72 rounded-full bg-black/10 blur-[90px]" />
      </div>
      <div className="relative">
        <span className="inline-block text-xs font-medium text-white bg-white/15 rounded-full px-3 py-1 mb-3">
          {boardName}
        </span>
        <h1 className="text-2xl sm:text-4xl font-black text-white leading-snug drop-shadow-sm">
          {title}
        </h1>
      </div>
    </div>
  )
}
