import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { HeartCrack } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <div className="relative">
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-display text-[120px] font-bold leading-none tracking-tighter text-ink/10 sm:text-[180px]"
        >
          404
        </motion.p>
        <motion.div
          className="absolute inset-0 flex items-center justify-center text-accent"
          initial={{ y: -30, opacity: 0, rotate: -40 }}
          animate={{ y: 0, opacity: 1, rotate: 12 }}
          transition={{ type: 'spring', stiffness: 160, damping: 10, delay: 0.2 }}
        >
          <HeartCrack size={84} strokeWidth={1.3} />
        </motion.div>
      </div>
      <h1 className="mt-6 font-display text-2xl font-semibold">Эта комната пуста</h1>
      <p className="mt-2 max-w-md text-sm text-ink-2">Страница не найдена. Кажется, кто-то подшутил над ссылкой.</p>
      <div className="mt-8 flex gap-3">
        <Link to="/" className="btn-primary">
          На главную
        </Link>
        <Link to="/year/1" className="btn-ghost">
          К томам
        </Link>
      </div>
    </div>
  )
}
