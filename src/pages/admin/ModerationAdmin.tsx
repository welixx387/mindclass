import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { deleteComment, useRecentComments } from '../../api/comments'
import { Avatar, ClassBadge } from '../../components/ui/Avatar'
import { confirmDialog } from '../../components/ui/Overlay'
import { toast } from '../../components/ui/Toaster'
import { formatCommentBody } from '../../lib/commentFormat'
import { timeAgo } from '../../lib/format'
import { translateError } from '../../store/auth'

export default function ModerationAdmin() {
  const { data, isLoading } = useRecentComments(60)
  const queryClient = useQueryClient()

  const remove = async (id: number) => {
    const ok = await confirmDialog({ title: 'Удалить комментарий?', description: 'Ответы на него тоже будут удалены.', confirmLabel: 'Удалить', danger: true })
    if (!ok) return
    try {
      await deleteComment(id)
      toast('Комментарий удалён')
      void queryClient.invalidateQueries({ queryKey: ['comments'] })
      void queryClient.invalidateQueries({ queryKey: ['comment-count'] })
      void queryClient.invalidateQueries({ queryKey: ['comment-counts'] })
    } catch (e) {
      toast.error('Не удалось удалить', { description: translateError(e) })
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Комментарии</h1>
      <p className="mt-2 text-sm text-ink-2">Последние сообщения со всего сайта. Спойлеры здесь показаны открытыми.</p>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="skeleton h-40 rounded-2xl" />
        ) : !data?.length ? (
          <p className="rounded-2xl border border-dashed border-line px-5 py-10 text-center text-sm text-muted">Комментариев пока нет.</p>
        ) : (
          <AnimatePresence initial={false}>
            {data.map((c) => (
              <motion.div key={c.id} layout exit={{ opacity: 0, height: 0 }} className="card flex gap-4 p-4">
                <Avatar name={c.author?.username} color={c.author?.avatar_color ?? 'graphite'} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{c.author?.username}</span>
                    {c.author && <ClassBadge letter={c.author.class_letter} />}
                    <span className="text-xs text-muted">{timeAgo(c.created_at)}</span>
                  </p>
                  <div
                    className="comment-body mt-1.5 break-words text-sm leading-relaxed [&_.spoiler]:bg-gold/15 [&_.spoiler]:text-ink [&_.spoiler]:[text-shadow:none]"
                    dangerouslySetInnerHTML={{ __html: formatCommentBody(c.body) }}
                  />
                  <Link to={c.href.replace('#comments', `#comment-${c.id}`)} className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-accent">
                    {c.placeTitle} · {c.placeSubtitle} <ExternalLink size={11} />
                  </Link>
                </div>
                <button className="icon-btn h-9 w-9 shrink-0 hover:text-danger" onClick={() => void remove(c.id)} aria-label="Удалить">
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
