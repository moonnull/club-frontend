// 웹3 스타일의 은은한 그라디언트 블롭 배경. 콘텐츠 뒤에 고정 배치되며
// 상호작용에 영향을 주지 않는다.
export default function GradientBackground() {
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 w-[550px] h-[550px] rounded-full bg-indigo-500/25 dark:bg-indigo-500/20 blur-[120px]" />
      <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-purple-500/20 dark:bg-purple-500/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-1/4 w-[450px] h-[450px] rounded-full bg-pink-400/15 dark:bg-pink-500/15 blur-[120px]" />
    </div>
  )
}
