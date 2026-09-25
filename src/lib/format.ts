/** Русское склонение по числу: plural(5, ['глава', 'главы', 'глав']) → 'глав'. */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (last > 1 && last < 5) return forms[1]
  if (last === 1) return forms[0]
  return forms[2]
}

export function countLabel(n: number, forms: [string, string, string]): string {
  return `${n.toLocaleString('ru-RU')} ${plural(n, forms)}`
}

/** Средняя скорость чтения художественного текста на русском. */
export const WORDS_PER_MINUTE = 180

export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

export function readingTimeLabel(words: number): string {
  const minutes = readingMinutes(words)
  if (minutes < 60) return `${minutes} мин`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} ч ${m} мин` : `${h} ч`
}

const rtf = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('ru', { numeric: 'auto' }) : null

export function timeAgo(date: string | number | Date, now = Date.now()): string {
  const t = new Date(date).getTime()
  const diff = Math.round((t - now) / 1000)
  const abs = Math.abs(diff)
  if (abs < 45) return 'только что'
  if (!rtf) return formatDate(date)
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day')
  return formatDate(date)
}

export function formatDate(date: string | number | Date): string {
  const d = new Date(date)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
