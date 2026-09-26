/**
 * Необязательный арт для главной страницы и страницы входа — файлом в сборке.
 *
 * Проще всего загрузить картинку через «Админку → Оформление» (она важнее
 * файла). Второй способ — положить её в src/assets/art/ с именем hero.webp
 * (или hero.png, hero.jpg, hero.avif) и пересобрать сайт. Если арта нет,
 * показывается талисман сайта Лина. Подробнее — в README.
 */
const found = import.meta.glob('../assets/art/hero.{webp,png,jpg,jpeg,avif}', {
  eager: true,
  import: 'default',
  query: '?url',
}) as Record<string, string>

export const HERO_ART: string | undefined = Object.values(found)[0]
