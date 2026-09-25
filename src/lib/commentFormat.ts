import { escapeHtml } from './markup'

/**
 * Превращает текст комментария в безопасный HTML.
 *
 *   ||текст||   → спойлер (размыт, открывается по клику)
 *   **текст**   → жирный
 *   *текст*     → курсив
 *   ссылки      → кликабельные, открываются в новой вкладке
 *   переносы    → <br>
 *
 * Сначала всё экранируется, затем добавляются только известные теги.
 */
export function formatCommentBody(body: string): string {
  let html = escapeHtml(body.replace(/\r\n?/g, '\n').trim())

  html = html.replace(/\|\|([\s\S]+?)\|\|/g, (_m, inner: string) => `<span class="spoiler" role="button" tabindex="0" title="Спойлер — нажмите, чтобы открыть">${inner}</span>`)
  html = html.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(^|[^*\p{L}\p{N}])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![*\p{L}\p{N}])/gu, '$1<em>$2</em>')
  html = html.replace(
    /(^|[\s(>])(https?:\/\/[^\s<]+[^\s<.,:;!?)\]'"»])/g,
    (_m, lead: string, url: string) => `${lead}<a href="${url}" target="_blank" rel="noopener noreferrer nofollow ugc">${url}</a>`
  )
  html = html.replace(/\n{3,}/g, '\n\n').replace(/\n/g, '<br>')
  return html
}

/** Есть ли в комментарии спойлер — для пометки в ленте. */
export function hasSpoiler(body: string): boolean {
  return /\|\|[\s\S]+?\|\|/.test(body)
}

/** Короткий текст комментария для превью: спойлеры скрыты. */
export function commentPreview(body: string, max = 140): string {
  const clean = body
    .replace(/\|\|[\s\S]+?\|\|/g, '[спойлер]')
    .replace(/\*\*|\*/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean
}
