'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ArrowLeft, Database, FileWarning, BellOff, Clock, ChevronDown } from 'lucide-react'
import { useConfirm } from '@/components/ConfirmDialog'
import { errorMessage, useToast } from '@/components/Toast'
import { getMe } from '@/lib/api/auth'
import {
  cleanupDeadNotifications,
  cleanupOldNotifications,
  cleanupOrphanFiles,
  getStorageStats,
  listDeadNotifications,
  listOldNotifications,
  listOrphanFiles,
  listAllNotifications,
  listAllCalendarItems,
  listAllPosts,
  listAllAssignments,
  getStorageUsage,
  deleteNotificationsByIds,
  deleteCalendarItemsByIds,
  deletePostsByIds,
  deleteAssignmentsByIds,
  type CalendarRow,
  type MaintenanceNotification,
  type NotificationRow,
  type OrphanFile,
  type PostRow,
  type AssignmentRow,
  type StorageUsage,
} from '@/lib/api/maintenance'
import { formatTimestamp } from '@/lib/formatDeadline'
import SelectableRows from '@/components/SelectableRows'
import { getStoredUser, saveAuth } from '@/lib/session'
import type { User } from '@/lib/types'

const TABLE_LABELS: Record<string, string> = {
  users: '회원',
  tracks: '트랙',
  plans: '플랜',
  posts: '게시글',
  comments: '댓글',
  attachments: '게시글 첨부',
  assignments: '과제',
  assignment_files: '과제 첨부',
  assignment_submissions: '제출물',
  submission_comments: '제출 댓글',
  assignment_questions: '질문',
  assignment_question_comments: '질문 답변',
  calendar_items: '캘린더',
  notifications: '알림',
}

function mb(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** 사용량 막대. 한도를 모르면(limit이 null) 막대 없이 사용량만 보여준다. */
function UsageBar({ used, limit }: { used: number | null; limit: number | null }) {
  if (used === null || limit === null || limit <= 0) return null
  const percent = Math.min(100, (used / limit) * 100)
  return (
    <div className="mt-1.5">
      <div
        className="h-1 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <div
          // 90%를 넘으면 붉게 — 무채색 팔레트지만 한도 임박은 경고로 봐야 한다.
          className={`h-full transition-all ${percent >= 90 ? 'bg-red-500' : 'bg-gray-900 dark:bg-white'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-gray-400 tabular-nums">{percent.toFixed(1)}% 사용</p>
    </div>
  )
}

// 현황 카드를 눌러 목록을 펼칠 수 있는 테이블.
// 게시글은 /posts에도 있지만 게시판별로 흩어져 있어, 오래된 테스트 글처럼
// "어느 게시판에 남겼는지 기억나지 않는 글"은 여기서 찾는 게 빠르다.
const BROWSABLE = new Set(['posts', 'assignments', 'notifications', 'calendar_items'])
const ROWS_PER_PAGE = 50

export default function AdminDataPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const router = useRouter()
  const [me, setMe] = useState<User | null>(() => getStoredUser<User>())
  const [stats, setStats] = useState<Record<string, number> | null>(null)

  // 각 정리 항목은 "조회 전 / 조회됨" 두 상태를 가진다. 조회하기 전에는
  // 아무것도 보여주지 않아, 실수로 삭제 버튼부터 누르는 일이 없게 한다.
  const [orphans, setOrphans] = useState<{ files: OrphanFile[]; total_bytes: number } | null>(null)
  const [dead, setDead] = useState<{ items: MaintenanceNotification[]; total: number } | null>(null)
  const [old, setOld] = useState<{ items: MaintenanceNotification[]; total: number } | null>(null)
  const [oldDays, setOldDays] = useState(90)
  const [busy, setBusy] = useState('')

  // 현황 카드를 눌러 펼친 목록
  const [openTable, setOpenTable] = useState<string | null>(null)
  const [notiRows, setNotiRows] = useState<{ rows: NotificationRow[]; total: number } | null>(null)
  const [calRows, setCalRows] = useState<{ rows: CalendarRow[]; total: number } | null>(null)
  const [postRows, setPostRows] = useState<{ rows: PostRow[]; total: number } | null>(null)
  const [asgRows, setAsgRows] = useState<{ rows: AssignmentRow[]; total: number } | null>(null)
  const [usage, setUsage] = useState<StorageUsage | null>(null)

  useEffect(() => {
    if (!getStoredUser<User>()) {
      router.replace('/login')
      return
    }
    getMe()
      .then((fresh) => {
        saveAuth(localStorage.getItem('token') ?? '', fresh)
        setMe(fresh)
        if (fresh.role !== 'ADMIN') {
          router.replace('/')
          return
        }
        getStorageStats()
          .then((s) => setStats(s.tables))
          .catch((err) => toast(errorMessage(err), 'error'))
        // 용량은 따로 부른다 — Cloudinary API를 타느라 느리거나 실패해도
        // 현황 표까지 함께 막히면 안 된다.
        getStorageUsage()
          .then(setUsage)
          .catch(() => {})
      })
      .catch(() => router.replace('/login'))
  }, [])

  async function run<T>(key: string, fn: () => Promise<T>, onDone: (r: T) => void) {
    setBusy(key)
    try {
      onDone(await fn())
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    } finally {
      setBusy('')
    }
  }

  async function confirmCleanup(message: string, count: number) {
    return confirm({
      message: `${message}\n삭제한 뒤에는 되돌릴 수 없습니다.`,
      confirmLabel: `${count}건 삭제`,
      destructive: true,
    })
  }

  async function openBrowser(table: string) {
    if (openTable === table) {
      setOpenTable(null)
      return
    }
    setOpenTable(table)
    if (table === 'posts') {
      await run('browse', () => listAllPosts(ROWS_PER_PAGE), (r) => setPostRows(r))
    } else if (table === 'assignments') {
      await run('browse', () => listAllAssignments(ROWS_PER_PAGE), (r) => setAsgRows(r))
    } else if (table === 'notifications') {
      await run('browse', () => listAllNotifications(ROWS_PER_PAGE), (r) => setNotiRows(r))
    } else if (table === 'calendar_items') {
      await run('browse', () => listAllCalendarItems(ROWS_PER_PAGE), (r) => setCalRows(r))
    }
  }

  async function deleteSelected(table: string, ids: number[]) {
    const confirmed = await confirm({
      message: `선택한 ${ids.length}건을 삭제합니다.\n삭제한 뒤에는 되돌릴 수 없습니다.`,
      confirmLabel: `${ids.length}건 삭제`,
      destructive: true,
    })
    if (!confirmed) return
    try {
      const r =
        table === 'posts'
          ? await deletePostsByIds(ids)
          : table === 'assignments'
            ? await deleteAssignmentsByIds(ids)
            : table === 'notifications'
              ? await deleteNotificationsByIds(ids)
              : await deleteCalendarItemsByIds(ids)
      toast(`${r.deleted}건을 삭제했습니다.`)
      refreshStats()
      // 목록을 다시 불러와 방금 지운 것이 남아 보이지 않게 한다.
      if (table === 'posts') setPostRows(await listAllPosts(ROWS_PER_PAGE))
      else if (table === 'assignments') setAsgRows(await listAllAssignments(ROWS_PER_PAGE))
      else if (table === 'notifications') setNotiRows(await listAllNotifications(ROWS_PER_PAGE))
      else setCalRows(await listAllCalendarItems(ROWS_PER_PAGE))
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  function refreshStats() {
    getStorageStats()
      .then((s) => setStats(s.tables))
      .catch(() => {})
    // 지우고 나면 용량도 줄어야 하므로 함께 갱신한다.
    getStorageUsage()
      .then(setUsage)
      .catch(() => {})
  }

  if (!me || me.role !== 'ADMIN') return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        관리자
      </Link>

      <div className="flex items-center gap-2 mt-4 mb-1">
        <Database aria-hidden="true" className="size-6 text-gray-900 dark:text-white" />
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">데이터 정리</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        더 이상 쓰이지 않는 데이터를 찾아 정리합니다. 목록을 먼저 확인한 뒤 삭제할 수 있습니다.
      </p>

      {/* ── 남은 용량 ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">남은 용량</h2>
        {usage === null ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="panel rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400">데이터베이스</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
                {mb(usage.database.used_bytes)}
                {usage.database.limit_bytes && (
                  <span className="text-sm font-normal text-gray-400">
                    {' / '}
                    {mb(usage.database.limit_bytes)}
                  </span>
                )}
              </p>
              <UsageBar used={usage.database.used_bytes} limit={usage.database.limit_bytes} />
              {!usage.database.limit_bytes && (
                <p className="mt-1 text-[11px] text-gray-400">
                  한도는 호스팅 플랜마다 달라 자동으로 알 수 없습니다.
                  {' '}
                  <code>DATABASE_SIZE_LIMIT_MB</code>를 설정하면 남은 양이 표시됩니다.
                </p>
              )}
              {usage.database.tables.length > 0 && (
                <ul className="mt-2.5 space-y-0.5">
                  {usage.database.tables.slice(0, 5).map((t) => (
                    <li key={t.name} className="flex text-[11px] text-gray-400">
                      <span className="truncate">{TABLE_LABELS[t.name] ?? t.name}</span>
                      <span className="ml-auto shrink-0 tabular-nums">{mb(t.bytes)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="panel rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400">
                Cloudinary (첨부파일)
                {usage.cloudinary?.plan && (
                  <span className="ml-1.5 badge-neutral px-1.5 py-0.5 rounded text-[10px]">
                    {usage.cloudinary.plan}
                  </span>
                )}
              </p>
              {usage.cloudinary === null ? (
                <p className="mt-1 text-sm text-gray-400">
                  조회할 수 없습니다. (CLOUDINARY_URL 미설정이거나 API 응답 없음)
                </p>
              ) : (
                <>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
                    {usage.cloudinary.storage.used !== null
                      ? mb(usage.cloudinary.storage.used)
                      : '—'}
                    {usage.cloudinary.storage.limit && (
                      <span className="text-sm font-normal text-gray-400">
                        {' / '}
                        {mb(usage.cloudinary.storage.limit)}
                      </span>
                    )}
                  </p>
                  <UsageBar
                    used={usage.cloudinary.storage.used}
                    limit={usage.cloudinary.storage.limit}
                  />
                  {/* 무료 플랜은 용량·대역폭·변환을 크레딧 하나로 묶어 센다.
                      실제 한도는 이쪽이라 함께 보여준다. */}
                  {usage.cloudinary.credits.limit !== null && (
                    <div className="mt-2.5">
                      <p className="text-[11px] text-gray-400 tabular-nums">
                        크레딧 {usage.cloudinary.credits.used ?? 0} /{' '}
                        {usage.cloudinary.credits.limit}
                      </p>
                      <UsageBar
                        used={usage.cloudinary.credits.used}
                        limit={usage.cloudinary.credits.limit}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── 저장소 현황 ── */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">저장소 현황</h2>
        {stats === null ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(stats).map(([key, count]) => {
                const label = TABLE_LABELS[key] ?? key
                const browsable = BROWSABLE.has(key)
                const content = (
                  <>
                    <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                      {label}
                      {browsable && (
                        <ChevronDown
                          aria-hidden="true"
                          className={`size-3 shrink-0 transition ${openTable === key ? 'rotate-180' : ''}`}
                        />
                      )}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums">
                      {count.toLocaleString('ko')}
                    </p>
                  </>
                )
                return browsable ? (
                  <button
                    key={key}
                    onClick={() => openBrowser(key)}
                    aria-expanded={openTable === key}
                    className={`panel rounded-xl px-3 py-2.5 text-left transition hover:border-gray-400 dark:hover:border-gray-600 ${
                      openTable === key ? 'border-gray-900 dark:border-white' : ''
                    }`}
                  >
                    {content}
                  </button>
                ) : (
                  <div key={key} className="panel rounded-xl px-3 py-2.5">{content}</div>
                )
              })}
            </div>

            {openTable && (
              <div className="panel rounded-xl p-4 mt-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {openTable === 'posts'
                    ? '게시판 구분 없는 전체 글입니다. 삭제하면 첨부 파일과 관련 알림도 함께 정리됩니다.'
                    : openTable === 'assignments'
                    ? '플랜·트랙 구분 없는 전체 과제입니다. 삭제하면 제출물·질문·댓글과 첨부 파일까지 함께 사라집니다.'
                    : openTable === 'notifications'
                      ? '모든 회원이 받은 알림입니다. 알림 벨에는 본인 것만 보이므로 여기서만 전체를 볼 수 있습니다.'
                      : '모든 캘린더 항목입니다. 캘린더 화면은 보고 있는 달만 조회하므로 여기서만 전체를 볼 수 있습니다.'}
                </p>
                {busy === 'browse' ? (
                  <p className="mt-3 text-sm text-gray-400">불러오는 중...</p>
                ) : openTable === 'posts' && postRows ? (
                  <SelectableRows
                    rows={postRows.rows}
                    total={postRows.total}
                    emptyMessage="게시글이 없습니다."
                    onDelete={(ids) => deleteSelected('posts', ids)}
                    renderRow={(post) => (
                      <>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {post.title}
                          {post.comment_count > 0 && (
                            <span className="ml-1.5 text-[10px] badge-neutral px-1.5 py-0.5 rounded">
                              댓글 {post.comment_count}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {post.board_name} · {post.author_name} · {formatTimestamp(post.created_at)}
                        </p>
                      </>
                    )}
                  />
                ) : openTable === 'assignments' && asgRows ? (
                  <SelectableRows
                    rows={asgRows.rows}
                    total={asgRows.total}
                    emptyMessage="과제가 없습니다."
                    onDelete={(ids) => deleteSelected('assignments', ids)}
                    renderRow={(a) => (
                      <>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {a.title}
                          {/* 제출물이 딸린 과제를 실수로 지우지 않도록 건수를 눈에 띄게 둔다. */}
                          {a.submission_count > 0 && (
                            <span className="ml-1.5 text-[10px] badge-neutral px-1.5 py-0.5 rounded">
                              제출 {a.submission_count}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {a.plan_name ?? '플랜 공통'} · {a.track_name ?? '트랙 공통'} ·{' '}
                          {a.author_name} · {formatTimestamp(a.start_at)}
                        </p>
                      </>
                    )}
                  />
                ) : openTable === 'notifications' && notiRows ? (
                  <SelectableRows
                    rows={notiRows.rows}
                    total={notiRows.total}
                    emptyMessage="알림이 없습니다."
                    onDelete={(ids) => deleteSelected('notifications', ids)}
                    renderRow={(n) => (
                      <>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {n.message}
                          {!n.is_read && (
                            <span className="ml-1.5 text-[10px] badge-neutral px-1.5 py-0.5 rounded">
                              안 읽음
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {n.recipient_name} · {formatTimestamp(n.created_at)}
                          {n.link ? ` · ${n.link}` : ''}
                        </p>
                      </>
                    )}
                  />
                ) : openTable === 'calendar_items' && calRows ? (
                  <SelectableRows
                    rows={calRows.rows}
                    total={calRows.total}
                    emptyMessage="캘린더 항목이 없습니다."
                    onDelete={(ids) => deleteSelected('calendar_items', ids)}
                    renderRow={(i) => (
                      <>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {i.title}
                          {i.is_done && (
                            <span className="ml-1.5 text-[10px] badge-neutral px-1.5 py-0.5 rounded">
                              완료
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          {i.item_date} · {i.author_name}
                        </p>
                      </>
                    )}
                  />
                ) : null}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── 고아 파일 ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <FileWarning aria-hidden="true" className="size-4 text-gray-500 dark:text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">고아 파일</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          업로드됐지만 어떤 글·과제에서도 참조하지 않는 파일입니다. 최근 7일 이내에 올라온 파일은
          작성 중일 수 있어 제외합니다.
        </p>
        <div className="panel rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => run('orphan', () => listOrphanFiles(), (r) => setOrphans({ files: r.files, total_bytes: r.total_bytes }))}
              disabled={busy === 'orphan'}
              className="btn-secondary text-sm px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {busy === 'orphan' ? '조회 중...' : '목록 보기'}
            </button>
            {orphans && (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {orphans.files.length}건 · {mb(orphans.total_bytes)}
                </span>
                {orphans.files.length > 0 && (
                  <button
                    onClick={async () => {
                      if (!(await confirmCleanup(`고아 파일 ${orphans.files.length}건(${mb(orphans.total_bytes)})을 Cloudinary에서 삭제합니다.`, orphans.files.length))) return
                      await run('orphan-del', () => cleanupOrphanFiles(), (r) => {
                        toast(`파일 ${r.deleted}건을 삭제했습니다.${r.failed ? ` (실패 ${r.failed}건)` : ''}`)
                        setOrphans(null)
                      })
                    }}
                    disabled={busy === 'orphan-del'}
                    className="ml-auto text-sm font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {busy === 'orphan-del' ? '삭제 중...' : '삭제'}
                  </button>
                )}
              </>
            )}
          </div>
          {orphans && orphans.files.length > 0 && (
            <ul className="mt-3 max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60 text-xs">
              {orphans.files.map((f) => (
                <li key={`${f.resource_type}/${f.public_id}`} className="flex items-center gap-2 py-1.5">
                  <span className="badge-neutral px-1.5 py-0.5 rounded shrink-0">{f.resource_type}</span>
                  <span className="text-gray-700 dark:text-gray-300 truncate">{f.public_id}</span>
                  <span className="ml-auto shrink-0 text-gray-400 tabular-nums">{(f.bytes / 1024).toFixed(0)} KB</span>
                </li>
              ))}
            </ul>
          )}
          {orphans && orphans.files.length === 0 && (
            <p className="mt-3 text-sm text-gray-400">정리할 파일이 없습니다.</p>
          )}
        </div>
      </section>

      {/* ── 죽은 알림 ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BellOff aria-hidden="true" className="size-4 text-gray-500 dark:text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">죽은 알림</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          가리키는 글이나 과제가 이미 삭제되어, 눌러도 아무 데도 갈 수 없는 알림입니다.
        </p>
        <div className="panel rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => run('dead', listDeadNotifications, (r) => setDead({ items: r.notifications, total: r.total }))}
              disabled={busy === 'dead'}
              className="btn-secondary text-sm px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {busy === 'dead' ? '조회 중...' : '목록 보기'}
            </button>
            {dead && (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300">{dead.total}건</span>
                {dead.total > 0 && (
                  <button
                    onClick={async () => {
                      if (!(await confirmCleanup(`죽은 알림 ${dead.total}건을 삭제합니다.`, dead.total))) return
                      await run('dead-del', cleanupDeadNotifications, (r) => {
                        toast(`알림 ${r.deleted}건을 삭제했습니다.`)
                        setDead(null)
                        refreshStats()
                      })
                    }}
                    disabled={busy === 'dead-del'}
                    className="ml-auto text-sm font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {busy === 'dead-del' ? '삭제 중...' : '삭제'}
                  </button>
                )}
              </>
            )}
          </div>
          {dead && dead.items.length > 0 && (
            <ul className="mt-3 max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60 text-xs">
              {dead.items.map((n) => (
                <li key={n.id} className="py-1.5">
                  <p className="text-gray-700 dark:text-gray-300 truncate">{n.message}</p>
                  <p className="text-gray-400">
                    {n.link} · {formatTimestamp(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {dead && dead.total === 0 && <p className="mt-3 text-sm text-gray-400">정리할 알림이 없습니다.</p>}
        </div>
      </section>

      {/* ── 오래된 읽은 알림 ── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Clock aria-hidden="true" className="size-4 text-gray-500 dark:text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">오래된 읽은 알림</h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          지정한 기간이 지난, 이미 읽은 알림입니다. 읽지 않은 알림은 아무리 오래돼도 남깁니다.
        </p>
        <div className="panel rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">
              <input
                type="number"
                min={1}
                max={3650}
                value={oldDays}
                onChange={(e) => {
                  setOldDays(Number(e.target.value))
                  setOld(null)
                }}
                aria-label="기준 일수"
                className="w-20 field mr-1.5 py-1"
              />
              일 이전
            </label>
            <button
              onClick={() => run('old', () => listOldNotifications(oldDays), (r) => setOld({ items: r.notifications, total: r.total }))}
              disabled={busy === 'old' || oldDays < 1}
              className="btn-secondary text-sm px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              {busy === 'old' ? '조회 중...' : '목록 보기'}
            </button>
            {old && (
              <>
                <span className="text-sm text-gray-600 dark:text-gray-300">{old.total}건</span>
                {old.total > 0 && (
                  <button
                    onClick={async () => {
                      if (!(await confirmCleanup(`${oldDays}일이 지난 읽은 알림 ${old.total}건을 삭제합니다.`, old.total))) return
                      await run('old-del', () => cleanupOldNotifications(oldDays), (r) => {
                        toast(`알림 ${r.deleted}건을 삭제했습니다.`)
                        setOld(null)
                        refreshStats()
                      })
                    }}
                    disabled={busy === 'old-del'}
                    className="ml-auto text-sm font-medium px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {busy === 'old-del' ? '삭제 중...' : '삭제'}
                  </button>
                )}
              </>
            )}
          </div>
          {old && old.items.length > 0 && (
            <ul className="mt-3 max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60 text-xs">
              {old.items.map((n) => (
                <li key={n.id} className="py-1.5">
                  <p className="text-gray-700 dark:text-gray-300 truncate">{n.message}</p>
                  <p className="text-gray-400">{formatTimestamp(n.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
          {old && old.total === 0 && <p className="mt-3 text-sm text-gray-400">정리할 알림이 없습니다.</p>}
        </div>
      </section>
    </div>
  )
}
