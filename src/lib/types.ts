export type ClassLetter = 'A' | 'B' | 'C' | 'D'
export type Role = 'reader' | 'moderator' | 'admin'

export interface Profile {
  id: string
  username: string
  class_letter: ClassLetter
  avatar_color: string
  bio: string
  role: Role
  created_at: string
}

export type ProfileSummary = Pick<Profile, 'id' | 'username' | 'class_letter' | 'avatar_color' | 'role'>

export interface ChapterMeta {
  id: number
  volume_slug: string
  position: number
  title: string
  word_count: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface Chapter extends ChapterMeta {
  content: string
}

export interface VolumeStats {
  volume_slug: string
  chapters: number
  words: number
  last_added_at: string
}

export interface CommentRow {
  id: number
  target: string
  user_id: string
  parent_id: number | null
  body: string
  like_count: number
  created_at: string
  edited_at: string | null
  author: ProfileSummary | null
}

export interface Bookmark {
  /** В облаке — число из базы, у гостя — строка вида `local-…`. */
  id: number | string
  chapter_id: number
  paragraph: number
  excerpt: string
  note: string
  created_at: string
  chapter_title: string
  volume_slug: string
  chapter_position: number
}

export interface Progress {
  chapter_id: number
  volume_slug: string
  paragraph: number
  percent: number
  completed: boolean
  updated_at: string
  chapter_title?: string
  chapter_position?: number
}

export interface SearchHit {
  id: number
  title: string
  volume_slug: string
  position: number
  snippet: string
  rank: number
}
