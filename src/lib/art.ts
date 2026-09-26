/**
 * Необязательный арт для главной страницы и страницы входа.
 *
 * Положите картинку в src/assets/art/ с именем hero.webp (или hero.png,
 * hero.jpg, hero.avif) — после сборки она появится на сайте. Если файла нет,
 * вместо него показывается фирменная эмблема. Подробнее — в README.
 */
const found = import.meta.glob('../assets/art/hero.{webp,png,jpg,jpeg,avif}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

export const HERO_ART: string | undefined = Object.values(found)[0]

/** Подпись к арту — по мотивам кого оформлен сайт. */
export const THEME_NAME = 'Амасава Итика'
