import { ChessBishop, ChessKing, ChessKnight, ChessPawn, ChessQueen, ChessRook, type LucideProps } from 'lucide-react'
import type { PieceName } from '../../data/catalog'

const PIECES = {
  pawn: ChessPawn,
  knight: ChessKnight,
  bishop: ChessBishop,
  rook: ChessRook,
  queen: ChessQueen,
  king: ChessKing,
} as const

export const PIECE_NAMES: Record<PieceName, string> = {
  pawn: 'Пешка',
  knight: 'Конь',
  bishop: 'Слон',
  rook: 'Ладья',
  queen: 'Ферзь',
  king: 'Король',
}

export const PIECE_ORDER: PieceName[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king']

export function ChessPiece({ piece, ...props }: { piece: PieceName } & LucideProps) {
  const Icon = PIECES[piece] ?? ChessPawn
  return <Icon aria-hidden="true" {...props} />
}
