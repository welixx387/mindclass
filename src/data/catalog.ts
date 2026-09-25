/**
 * Каталог серии: годы обучения и тома.
 *
 * Здесь только метаданные (номера томов и короткие описания без спойлеров,
 * написанные для сайта). Тексты глав хранятся в базе Supabase и
 * загружаются через админ-панель: «Админка → Импорт».
 *
 * Чтобы добавить новый год (например, третий) — допишите объект в YEARS
 * по образцу ниже, slug тома строится как `y<год>-v<номер>`.
 */

export type PieceName = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king'

export interface Volume {
  /** Уникальный ключ тома, например `y1-v4.5`. Используется в URL и в базе. */
  slug: string
  year: number
  /** Номер тома так, как он пронумерован в оригинале: '1', '4.5'. */
  number: string
  /** Короткая тема тома для карточки. */
  theme: string
  /** Короткое описание без серьёзных спойлеров. */
  description: string
  /** Половинные тома — сборники побочных историй. */
  kind: 'main' | 'side'
  /** Фигура на сгенерированной обложке. */
  piece: PieceName
  /** Необязательная своя обложка: положите файл в public/covers и укажите путь. */
  cover?: string
}

export interface Year {
  number: number
  title: string
  short: string
  tagline: string
  description: string
  volumes: Volume[]
}

export const SERIES = {
  title: 'Добро пожаловать в класс превосходства',
  original: 'Youkoso Jitsuryoku Shijou Shugi no Kyoushitsu e',
  author: 'Сёго Кинугаса',
  illustrator: 'Томосэ Сюнсаку',
  about:
    'Элитная старшая школа, где ученикам платят очками за успехи, а классы соревнуются за место на вершине. ' +
    'Здесь ценят не громкие слова, а умение просчитать ход наперёд.',
}

type VolumeSeed = Omit<Volume, 'slug' | 'year' | 'kind'> & { kind?: Volume['kind'] }

function makeYear(number: number, meta: Omit<Year, 'number' | 'volumes'>, seeds: VolumeSeed[]): Year {
  return {
    number,
    ...meta,
    volumes: seeds.map((seed) => ({
      ...seed,
      slug: `y${number}-v${seed.number}`,
      year: number,
      kind: seed.kind ?? (seed.number.includes('.') ? 'side' : 'main'),
    })),
  }
}

export const YEARS: Year[] = [
  makeYear(
    1,
    {
      title: '1 год обучения',
      short: '1 год',
      tagline: 'Класс D, система очков и первые специальные экзамены',
      description:
        'Аянокодзи Киётака поступает в школу, где всё измеряется очками, а каждый класс борется за право называться лучшим. ' +
        'Класс D с первых недель оказывается на самом дне — и лишь немногие догадываются, кто на самом деле ведёт игру.',
    },
    [
      {
        number: '1',
        theme: 'Система',
        piece: 'pawn',
        description:
          'Престижная школа, где за успехи платят очками. Первый месяц, первые траты — и неприятная правда о том, как здесь оценивают класс D.',
      },
      {
        number: '2',
        theme: 'Свидетель',
        piece: 'knight',
        description:
          'Одна драка может ударить по всему классу. Разбирательство в студсовете, поиски свидетеля и спор, в котором решает не сила.',
      },
      {
        number: '3',
        theme: 'Остров',
        piece: 'rook',
        description:
          'Неделя на необитаемом острове: очки на выживание, тайные лидеры и игра, в которой видно далеко не всё.',
      },
      {
        number: '4',
        theme: 'Лайнер',
        piece: 'bishop',
        description:
          'Круизный лайнер, двенадцать смешанных групп и экзамен, где главное — вычислить, кто скрывается под маской «цели».',
      },
      {
        number: '4.5',
        theme: 'Лето',
        piece: 'pawn',
        description: 'Последние дни летних каникул: истории о том, чем живут ученики, когда экзаменов нет.',
      },
      {
        number: '5',
        theme: 'Спортфестиваль',
        piece: 'knight',
        description:
          'Спортивный фестиваль: командная борьба, закулисные договорённости и эстафета, о которой будут говорить ещё долго.',
      },
      {
        number: '6',
        theme: 'Перетасовка',
        piece: 'bishop',
        description:
          'Классы составляют задания друг для друга, а ученики сдают экзамен в парах. Тем временем кто-то всерьёз ищет таинственного «X».',
      },
      {
        number: '7',
        theme: 'Икс',
        piece: 'queen',
        description: 'Охота на «X» подходит к развязке. Зима, холодный ветер на крыше и ход, которого никто не ждал.',
      },
      {
        number: '7.5',
        theme: 'Зима',
        piece: 'rook',
        description: 'Зимние каникулы и Рождество: короткая передышка между раундами большой игры.',
      },
      {
        number: '8',
        theme: 'Лагерь',
        piece: 'knight',
        description:
          'Смешанный лагерь со старшеклассниками: группы из разных классов и курсов, общие правила и соперничество в студсовете.',
      },
      {
        number: '9',
        theme: 'Слухи',
        piece: 'bishop',
        description: 'По школе ползут слухи, и под удар попадает Итиносэ. Февраль, День святого Валентина и вопрос доверия.',
      },
      {
        number: '10',
        theme: 'Голосование',
        piece: 'queen',
        description:
          'Экзамен-голосование, после которого кто-то обязан покинуть школу. А ещё — визит, которого никто не ждал.',
      },
      {
        number: '11',
        theme: 'Финал года',
        piece: 'king',
        description: 'Итоговый экзамен первого года: класс против класса, лидеры лицом к лицу.',
      },
      {
        number: '11.5',
        theme: 'Весна',
        piece: 'pawn',
        description: 'Весенние каникулы: выпуск старшеклассников, новые отношения и последние ходы перед вторым годом.',
      },
    ]
  ),
  makeYear(
    2,
    {
      title: '2 год обучения',
      short: '2 год',
      tagline: 'Новые первокурсники, экзамены между курсами и старые долги',
      description:
        'Второй год приносит новых первокурсников, экзамены сразу для нескольких курсов и угрозы, пришедшие из прошлого. ' +
        'Ставки растут, а союзники и противники всё чаще меняются местами.',
    },
    [
      {
        number: '1',
        theme: 'Пары',
        piece: 'pawn',
        description:
          'В школу приходят первокурсники, и первый экзамен объединяет их со вторым годом в пары. Кто-то из новичков явился с особой целью.',
      },
      {
        number: '2',
        theme: 'Союзы',
        piece: 'knight',
        description:
          'Итоги парного экзамена и подготовка к лету: новые союзы между курсами и тревожные сигналы среди первокурсников.',
      },
      {
        number: '3',
        theme: 'Остров II',
        piece: 'rook',
        description:
          'Необитаемый остров снова ждёт — теперь для всей школы сразу: группы из разных курсов, задания на время и высокие ставки.',
      },
      {
        number: '4',
        theme: 'Вершина',
        piece: 'queen',
        description: 'Экзамен на острове выходит на финишную прямую. Кто доберётся до вершины рейтинга — и какой ценой?',
      },
      {
        number: '4.5',
        theme: 'Лето',
        piece: 'pawn',
        description: 'Летние каникулы после острова: истории о передышке, которая бывает только между экзаменами.',
      },
      {
        number: '5',
        theme: 'Единогласие',
        piece: 'bishop',
        description:
          'Второй семестр начинается с неожиданного экзамена, где каждое решение класс обязан принять единогласно.',
      },
      {
        number: '6',
        theme: 'Спортфестиваль',
        piece: 'knight',
        description:
          'Последствия «единогласного» экзамена и новый спортивный фестиваль, подготовку к которому соперники пытаются сорвать.',
      },
      {
        number: '7',
        theme: 'Культурный фестиваль',
        piece: 'rook',
        description: 'Первый культурный фестиваль в истории школы и соревнование кафе, где считают не только выручку.',
      },
      {
        number: '8',
        theme: 'Поездка',
        piece: 'bishop',
        description: 'Школьная поездка без экзаменов — но в смешанных группах из всех четырёх классов сразу.',
      },
      {
        number: '9',
        theme: 'Совместный тест',
        piece: 'queen',
        description:
          'Последний экзамен семестра — совместный письменный тест, где ученики отвечают по очереди. Класс Хорикиты против класса Сакаянаги.',
      },
      {
        number: '9.5',
        theme: 'Зима',
        piece: 'pawn',
        description: 'Зимние каникулы: короткие истории между семестрами.',
      },
      {
        number: '10',
        theme: 'Выживание',
        piece: 'knight',
        description: 'Третий семестр открывается экзаменом на выживание и выбывание, где классы сходятся по разным предметам.',
      },
      {
        number: '11',
        theme: 'Лагерь',
        piece: 'bishop',
        description:
          'Лагерь для общения между курсами — без исключений и штрафов. Но у Хорикиты свои счёты с Амасавой.',
      },
      {
        number: '12',
        theme: 'Турнир',
        piece: 'king',
        description:
          'Итоговый экзамен второго года: турнир на выбывание, где каждый класс выставляет авангард, центр и генерала.',
      },
      {
        number: '12.5',
        theme: 'Эпилог года',
        piece: 'pawn',
        description: 'Финальный том второго года: весенние каникулы и истории, которые подводят черту.',
      },
    ]
  ),
]

export const ALL_VOLUMES: Volume[] = YEARS.flatMap((y) => y.volumes)

const BY_SLUG = new Map(ALL_VOLUMES.map((v) => [v.slug, v]))

export function getVolume(slug: string | undefined): Volume | undefined {
  return slug ? BY_SLUG.get(slug) : undefined
}

export function getYear(number: number | string | undefined): Year | undefined {
  const n = Number(number)
  return YEARS.find((y) => y.number === n)
}

export function volumeTitle(v: Pick<Volume, 'number'>): string {
  return `Том ${v.number}`
}

export function volumeFullTitle(v: Pick<Volume, 'number' | 'year'>): string {
  return `${v.year} год · Том ${v.number}`
}

/** Соседние тома в сквозном порядке (через границу годов тоже). */
export function adjacentVolumes(slug: string): { prev?: Volume; next?: Volume } {
  const i = ALL_VOLUMES.findIndex((v) => v.slug === slug)
  if (i < 0) return {}
  return { prev: ALL_VOLUMES[i - 1], next: ALL_VOLUMES[i + 1] }
}

export function volumeIndexInYear(v: Volume): number {
  const year = getYear(v.year)
  return year ? year.volumes.findIndex((x) => x.slug === v.slug) : 0
}
