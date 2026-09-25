import { Link } from 'react-router-dom'
import { SERIES } from '../../data/catalog'
import { Logo } from '../brand/Logo'

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line/60">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-2">
            Фанатская читалка ранобэ «{SERIES.title}». Удобный текст, закладки и обсуждения — без рекламы и лишнего шума.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">Каталог</p>
          <ul className="space-y-2.5 text-sm text-ink-2">
            <li>
              <Link className="transition-colors hover:text-ink" to="/year/1">
                1 год обучения
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-ink" to="/year/2">
                2 год обучения
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-ink" to="/demo">
                Как устроена читалка
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Читателю</p>
          <ul className="space-y-2.5 text-sm text-ink-2">
            <li>
              <Link className="transition-colors hover:text-ink" to="/bookmarks">
                Мои закладки
              </Link>
            </li>
            <li>
              <Link className="transition-colors hover:text-ink" to="/profile">
                Профиль
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line/60">
        <div className="container-page flex flex-col gap-2 py-6 text-xs leading-relaxed text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Некоммерческий фанатский проект. Произведение и персонажи принадлежат автору ({SERIES.author}), иллюстратору и
            издателям. Тексты глав размещает администрация сайта.
          </p>
          <p className="shrink-0">© {new Date().getFullYear()} MindClass</p>
        </div>
      </div>
    </footer>
  )
}
