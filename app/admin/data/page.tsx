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
  deleteNotificationsByIds,
  deleteCalendarItemsByIds,
  type CalendarRow,
  type MaintenanceNotification,
  type NotificationRow,
  type OrphanFile,
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
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// 관리자가 전체를 볼 화면이 따로 없는 테이블만 여기서 펼쳐본다.
// 회원·게시글·과제 등은 각자 전용 관리 화면에서 지워야 첨부 파일·알림
// 정리 같은 후속 처리가 함께 돈다.
const BROWSABLE = new Set(['notifications', 'calendar_items'])
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
    if (table === 'notifications') {
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
        table === 'notifications'
          ? await deleteNotificationsByIds(ids)
          : await deleteCalendarItemsByIds(ids)
      toast(`${r.deleted}건을 삭제했습니다.`)
      refreshStats()
      // 목록을 다시 불러와 방금 지운 것이 남아 보이지 않게 한다.
      if (table === 'notifications') setNotiRows(await listAllNotifications(ROWS_PER_PAGE))
      else setCalRows(await listAllCalendarItems(ROWS_PER_PAGE))
    } catch (err: unknown) {
      toast(errorMessage(err), 'error')
    }
  }

  function refreshStats() {
    getStorageStats()
      .then((s) => setStats(s.tables))
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
                  {openTable === 'notifications'
                    ? '모든 회원이 받은 알림입니다. 알림 벨에는 본인 것만 보이므로 여기서만 전체를 볼 수 있습니다.'
                    : '모든 캘린더 항목입니다. 캘린더 화면은 보고 있는 달만 조회하므로 여기서만 전체를 볼 수 있습니다.'}
                </p>
                {busy === 'browse' ? (
                  <p className="mt-3 text-sm text-gray-400">불러오는 중...</p>
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
