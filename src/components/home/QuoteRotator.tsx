import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { QUOTES } from '../../data/quotes'

/** Эпиграф, который сменяется каждые несколько секунд — слово за словом. */
export function QuoteRotator() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length))

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), 9000)
    return () => clearInterval(t)
  }, [])

  const quote = QUOTES[index]
  const words = quote.text.split(' ')

  return (
    <div className="relative mx-auto max-w-3xl px-2 text-center">
      <span aria-hidden="true" className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 font-quote text-[140px] leading-none text-accent/15">
        «
      </span>
      <AnimatePresence mode="wait">
        <motion.figure key={index} initial="hidden" animate="visible" exit="exit" className="relative min-h-[150px] sm:min-h-[132px]">
          <blockquote className="font-quote text-[26px] font-medium italic leading-snug text-ink sm:text-[34px]">
            {words.map((word, i) => (
              <motion.span
                key={i}
                className="inline-block pr-[0.28em]"
                variants={{
                  hidden: { opacity: 0, y: 10, filter: 'blur(6px)' },
                  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: i * 0.05, duration: 0.5 } },
                  exit: { opacity: 0, y: -6, filter: 'blur(4px)', transition: { duration: 0.25 } },
                }}
              >
                {word}
              </motion.span>
            ))}
          </blockquote>
          <motion.figcaption
            className="mt-5 font-display text-xs uppercase tracking-[0.3em] text-muted"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { delay: words.length * 0.05 + 0.2 } },
              exit: { opacity: 0 },
            }}
          >
            — {quote.author}
          </motion.figcaption>
        </motion.figure>
      </AnimatePresence>
      <div className="mt-6 flex justify-center gap-1.5">
        {QUOTES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Цитата ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-6 bg-accent' : 'w-1.5 bg-line hover:bg-muted'}`}
          />
        ))}
      </div>
    </div>
  )
}
