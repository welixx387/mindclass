import { motion } from 'framer-motion'
import { Heart, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useUserComments } from '../../api/comments'
import { commentPreview } from '../../lib/commentFormat'
import { timeAgo } from '../../lib/format'

export function CommentFeed({ userId }: { userId: string }) {
  const { data, isLoading } = useUserComments(userId, 30)
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
    )
  }
  if (!data?.length) {
    return <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">Комментариев пока нет.</p>
  }
  return (
    <ul className="space-y-3">
      {data.map((c, i) => (
        <motion.li key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
          <Link to={c.href.replace('#comments', `#comment-${c.id}`)} className="card group block p-4 transition-colors hover:border-accent/35">
            <p className="flex items-center gap-2 text-xs text-muted">
              <MessageCircle size={13} className="text-accent" />
              <span className="truncate text-ink-2 group-hover:text-accent">{c.placeTitle}</span>
              <span className="hidden truncate sm:inline">· {c.placeSubtitle}</span>
              <span className="ml-auto shrink-0">{timeAgo(c.created_at)}</span>
            </p>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink">{commentPreview(c.body, 300)}</p>
            {c.like_count > 0 && (
              <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
                <Heart size={12} /> {c.like_count}
              </p>
            )}
          </Link>
        </motion.li>
      ))}
    </ul>
  )
}
