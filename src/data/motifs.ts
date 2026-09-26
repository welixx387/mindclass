/**
 * Мотивы оформления: значки на обложках томов и на аватарах читателей.
 * Сами иконки подключаются в components/brand/Motif.tsx.
 */

export type MotifName =
  | 'heart'
  | 'star'
  | 'sparkles'
  | 'flower'
  | 'ribbon'
  | 'cherry'
  | 'candy'
  | 'moon'
  | 'gift'
  | 'cake'
  | 'trophy'

/** Значки, из которых читатель выбирает аватар (хранятся в profiles.avatar_piece). */
export type AvatarMotif = 'heart' | 'star' | 'sparkles' | 'flower' | 'ribbon' | 'cherry'

export const AVATAR_MOTIFS: AvatarMotif[] = ['heart', 'star', 'sparkles', 'flower', 'ribbon', 'cherry']

export const MOTIF_LABELS: Record<MotifName, string> = {
  heart: 'Сердце',
  star: 'Звезда',
  sparkles: 'Искры',
  flower: 'Цветок',
  ribbon: 'Бант',
  cherry: 'Вишня',
  candy: 'Конфета',
  moon: 'Луна',
  gift: 'Подарок',
  cake: 'Пирожное',
  trophy: 'Кубок',
}
