import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownRight, Heart, LogIn, MessageSquareText, MessagesSquare, MoreHorizontal, Pencil, Reply, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  deleteComment,
  editComment,
  postComment,
  setLike,
  useCommentCount,
  useCommentThreads,
  useMyLikes,
  type CommentSort,
  type CommentThread,
} from '../../api/comments'
import { formatCommentBody } from '../../lib/commentFormat'
import { formatDate, timeAgo } from '../../lib/format'
import { isSupabaseConfigured } from '../../lib/supabase'
import type { CommentRow } from '../../lib/types'
import { translateError, useAuth } from '../../store/auth'
import { Avatar, ClassBadge, RoleBadge } from '../ui/Avatar'
import { EmptyState, Spinner } from '../ui/misc'
import { confirmDialog } from '../ui/Overlay'
import { toast } from '../ui/Toaster'
import { CommentComposer } from './CommentComposer'

const SORTS: { id: CommentSort; label: string }[] = [
  { id: 'new', label: 'Новые' },
  { id: 'top', label: 'Популярные' },
  { id: 'old', label: 'Старые' },
]

const REPLIES_PREVIEW = 3

function revealSpoiler(e: MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) {
  const el = (e.target as HTMLElement).closest('.spoiler')
  if (el && !el.classList.contains('revealed')) {
    e.preventDefault()
    el.classList.add('revealed')
  }
}

export function CommentSection({ target, heading = 'Обсуждение' }: { target: string; heading?: string }) {
  const [sort, setSort] = useState<CommentSort>('new')
  const status = useAuth((s) => s.status)
  const location = useLocation()
  const queryClient = useQueryClient()
  const { data: count } = useCommentCount(target)
  const threads = useCommentThreads(target, sort)

  const all = useMemo(() => threads.data?.pages.flatMap((p) => p.threads) ?? [], [threads.data])
  const ids = useMemo(() => all.flatMap((t) => [t.root.id, ...t.replies.map((r) => r.id)]), [all])
  const { data: liked } = useMyLikes(ids)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['comments'] })
    void queryClient.invalidateQueries({ queryKey: ['comment-count', target] })
    void queryClient.invalidateQueries({ queryKey: ['comment-counts'] })
  }

  const submitRoot = async (body: string) => {
    try {
      await postComment({ target, body })
      if (sort !== 'new') setSort('new')
      refresh()
      toast.success('Комментарий опубликован')
      return true
    } catch (e) {
      toast.error('Не удалось отправить', { description: translateError(e) })
      return false
    }
  }

  const next = `${location.pathname}${location.search}#comments`

  return (
    <section id="comments" className="scroll-mt-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 font-display text-xl font-semibold tracking-tight sm:text-2xl">
          <MessagesSquare size={22} className="text-accent" />
          {heading}
          {typeof count === 'number' && count > 0 && <span className="chip font-sans text-sm">{count}</span>}
        </h2>
        {isSupabaseConfigured && all.length > 1 && (
          <div className="flex rounded-full border border-line bg-surface/60 p-1">
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`relative rounded-full px-3 py-1 text-xs font-semibold transition-colors ${sort === s.id ? 'text-ink' : 'text-muted hover:text-ink'}`}
              >
                {sort === s.id && <motion.span layoutId={`sort-${target}`} className="absolute inset-0 rounded-full bg-surface-2 ring-1 ring-line" />}
                <span className="relative">{s.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!isSupabaseConfigured ? (
        <EmptyState icon={<MessageSquareText size={24} />} title="Комментарии скоро появятся">
          Обсуждения заработают, когда к сайту подключат базу данных Supabase.
        </EmptyState>
      ) : (
        <>
          {status === 'signed-in' ? (
            <CommentComposer onSubmit={submitRoot} />
          ) : status === 'signed-out' ? (
            <div className="card flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
                <LogIn size={20} />
              </div>
              <p className="flex-1 text-sm text-ink-2">Войдите, чтобы писать комментарии, отвечать и ставить лайки. Читать обсуждение можно и без аккаунта.</p>
              <div className="flex gap-2">
                <Link to={`/login?next=${encodeURIComponent(next)}`} className="btn-primary">
                  Войти
                </Link>
                <Link to={`/register?next=${encodeURIComponent(next)}`} className="btn-ghost">
                  Регистрация
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mt-8" onClick={revealSpoiler} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && revealSpoiler(e)}>
            {threads.isLoading ? (
              <div className="space-y-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <span className="skeleton h-10 w-10 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <span className="skeleton block h-3.5 w-40" />
                      <span className="skeleton block h-3.5 w-full" />
                      <span className="skeleton block h-3.5 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : threads.isError ? (
              <p className="text-sm text-danger">Не удалось загрузить комментарии: {translateError(threads.error)}</p>
            ) : all.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
                Здесь пока тихо. Станьте первым, кто поделится мнением.
              </div>
            ) : (
              <ul className="space-y-7">
                <AnimatePresence initial={false}>
                  {all.map((thread) => (
                    <motion.li
                      key={thread.root.id}
                      layout="position"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Thread thread={thread} liked={liked} onChanged={refresh} />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}

            {threads.hasNextPage && (
              <div className="mt-8 flex justify-center">
                <button className="btn-ghost" onClick={() => void threads.fetchNextPage()} disabled={threads.isFetchingNextPage}>
                  {threads.isFetchingNextPage && <Spinner size={15} />} Показать ещё
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function Thread({ thread, liked, onChanged }: { thread: CommentThread; liked?: Set<number>; onChanged: () => void }) {
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null)
  const [expanded, setExpanded] = useState(false)
  const hidden = thread.replies.length - REPLIES_PREVIEW
  const replies = expanded || hidden <= 0 ? thread.replies : thread.replies.slice(0, REPLIES_PREVIEW)

  const submitReply = async (body: string) => {
    try {
      await postComment({ target: thread.root.target, body, parentId: thread.root.id })
      setReplyTo(null)
      setExpanded(true)
      onChanged()
      return true
    } catch (e) {
      toast.error('Не удалось ответить', { description: translateError(e) })
      return false
    }
  }

  return (
    <div>
      <CommentItem comment={thread.root} liked={liked?.has(thread.root.id)} onReply={setReplyTo} onChanged={onChanged} />
      {(replies.length > 0 || replyTo) && (
        <div className="ml-5 mt-4 space-y-5 border-l border-line/80 pl-5 sm:ml-[19px] sm:pl-7">
          <AnimatePresence initial={false}>
            {replies.map((r) => (
              <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                <CommentItem comment={r} liked={liked?.has(r.id)} onReply={setReplyTo} onChanged={onChanged} small />
              </motion.div>
            ))}
          </AnimatePresence>
          {hidden > 0 && !expanded && (
            <button onClick={() => setExpanded(true)} className="flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
              <CornerDownRight size={15} /> Показать ещё {hidden} {hidden === 1 ? 'ответ' : hidden < 5 ? 'ответа' : 'ответов'}
            </button>
          )}
          <AnimatePresence>
            {replyTo && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <CommentComposer
                  key={replyTo.id}
                  compact
                  autoFocus
                  initial={replyTo.id !== thread.root.id && replyTo.author ? `@${replyTo.author.username}, ` : ''}
                  placeholder={`Ответ для ${replyTo.author?.username ?? 'читателя'}…`}
                  submitLabel="Ответить"
                  onSubmit={submitReply}
                  onCancel={() => setReplyTo(null)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function LikeButton({ comment, liked, own }: { comment: CommentRow; liked: boolean; own: boolean }) {
  const status = useAuth((s) => s.status)
  const [state, setState] = useState({ liked, count: comment.like_count })
  const [burst, setBurst] = useState(0)
  const pending = useRef(false)

  useEffect(() => setState({ liked, count: comment.like_count }), [liked, comment.like_count])

  const toggle = async () => {
    if (status !== 'signed-in') {
      toast('Войдите, чтобы ставить лайки')
      return
    }
    if (own) {
      toast('Свой комментарий лайкнуть нельзя')
      return
    }
    if (pending.current) return
    pending.current = true
    const next = !state.liked
    setState((s) => ({ liked: next, count: s.count + (next ? 1 : -1) }))
    if (next) setBurst((b) => b + 1)
    try {
      await setLike(comment.id, next)
    } catch (e) {
      setState((s) => ({ liked: !next, count: s.count + (next ? -1 : 1) }))
      toast.error('Не получилось', { description: translateError(e) })
    } finally {
      pending.current = false
    }
  }

  return (
    <button
      onClick={() => void toggle()}
      className={`group relative inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold transition-colors ${
        state.liked ? 'text-accent' : 'text-muted hover:text-accent'
      }`}
      aria-pressed={state.liked}
      aria-label={state.liked ? 'Убрать лайк' : 'Нравится'}
    >
      <span className="relative">
        <motion.span key={burst} initial={burst ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 12 }} className="block">
          <Heart size={15} className={state.liked ? 'fill-current' : ''} />
        </motion.span>
        <AnimatePresence>
          {burst > 0 && state.liked && (
            <motion.span
              key={`b${burst}`}
              className="pointer-events-none absolute inset-0 rounded-full"
              initial={{ scale: 0.6, opacity: 0.8, boxShadow: '0 0 0 2px rgb(var(--accent))' }}
              animate={{ scale: 2.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          )}
        </AnimatePresence>
      </span>
      {state.count > 0 && <span className="tabular-nums">{state.count}</span>}
    </button>
  )
}

function CommentItem({
  comment,
  liked = false,
  small = false,
  onReply,
  onChanged,
}: {
  comment: CommentRow
  liked?: boolean
  small?: boolean
  onReply: (c: CommentRow) => void
  onChanged: () => void
}) {
  const me = useAuth((s) => s.profile)
  const [editing, setEditing] = useState(false)
  const [menu, setMenu] = useState(false)
  const own = me?.id === comment.user_id
  const canDelete = own || me?.role === 'admin' || me?.role === 'moderator'
  const html = useMemo(() => formatCommentBody(comment.body), [comment.body])
  const author = comment.author

  const save = async (body: string) => {
    try {
      await editComment(comment.id, body)
      setEditing(false)
      onChanged()
      return true
    } catch (e) {
      toast.error('Не удалось сохранить', { description: translateError(e) })
      return false
    }
  }

  const remove = async () => {
    setMenu(false)
    const ok = await confirmDialog({
      title: 'Удалить комментарий?',
      description: comment.parent_id ? 'Это действие нельзя отменить.' : 'Ответы на него тоже будут удалены. Это действие нельзя отменить.',
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return
    try {
      await deleteComment(comment.id)
      onChanged()
      toast('Комментарий удалён')
    } catch (e) {
      toast.error('Не удалось удалить', { description: translateError(e) })
    }
  }

  return (
    <article id={`comment-${comment.id}`} className="group/comment flex scroll-mt-28 gap-3 sm:gap-4">
      <Link to={author ? `/u/${encodeURIComponent(author.username)}` : '#'} className="shrink-0">
        <Avatar name={author?.username} color={author?.avatar_color ?? 'graphite'} size={small ? 32 : 40} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link to={author ? `/u/${encodeURIComponent(author.username)}` : '#'} className="text-sm font-semibold hover:text-accent">
            {author?.username ?? 'Удалённый читатель'}
          </Link>
          {author && <ClassBadge letter={author.class_letter} />}
          {author && <RoleBadge role={author.role} />}
          <span className="text-xs text-muted" title={new Date(comment.created_at).toLocaleString('ru-RU')}>
            {timeAgo(comment.created_at)}
          </span>
          {comment.edited_at && (
            <span className="text-xs italic text-muted" title={`Изменено ${formatDate(comment.edited_at)}`}>
              · изменено
            </span>
          )}
        </div>

        {editing ? (
          <div className="mt-2">
            <CommentComposer initial={comment.body} autoFocus compact submitLabel="Сохранить" onSubmit={save} onCancel={() => setEditing(false)} />
          </div>
        ) : (
          <div className="comment-body mt-1.5 break-words text-[15px] leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: html }} />
        )}

        {!editing && (
          <div className="-ml-2 mt-1.5 flex items-center gap-1">
            <LikeButton comment={comment} liked={liked} own={own} />
            {me && (
              <button onClick={() => onReply(comment)} className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-muted transition-colors hover:text-ink">
                <Reply size={14} /> Ответить
              </button>
            )}
            {(own || canDelete) && (
              <div className="relative">
                <button
                  onClick={() => setMenu((v) => !v)}
                  onBlur={() => setTimeout(() => setMenu(false), 150)}
                  className="rounded-full p-1 text-muted opacity-60 transition-opacity hover:text-ink group-hover/comment:opacity-100"
                  aria-label="Действия"
                >
                  <MoreHorizontal size={16} />
                </button>
                <AnimatePresence>
                  {menu && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute left-0 top-8 z-20 w-44 rounded-xl border border-line bg-elev p-1.5 shadow-pop"
                    >
                      {own && (
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setMenu(false)
                            setEditing(true)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink"
                        >
                          <Pencil size={14} /> Изменить
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => void remove()}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-danger hover:bg-danger/10"
                        >
                          <Trash2 size={14} /> Удалить
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
