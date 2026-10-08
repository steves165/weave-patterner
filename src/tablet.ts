/** One card (tablet): the colour threaded through each of its four holes, A to D, and which way it's threaded. */
export interface Card {
  holes: [string, string, string, string]
  threading: 'S' | 'Z'
  /** Turns the opposite way to the pack on every row (to make mirror-image motifs, for example). */
  opposite?: boolean
}

export type Turn = 'F' | 'B'

export interface TabletDesign {
  cards: Card[]
  /** The pack's turn for each row: forward or back, all cards together. */
  turns: Turn[]
  /** Single cards turned the other way on single rows, as "row,card" (0-based). */
  flipped?: string[]
}

/** How one card turns on one row: the pack's turn, reversed for an opposite card, and reversed again if flipped. */
export function cardTurn(design: TabletDesign, row: number, card: number): Turn {
  const reverse = (t: Turn): Turn => (t === 'F' ? 'B' : 'F')
  let turn = design.turns[row]
  if (design.cards[card]?.opposite) turn = reverse(turn)
  if (design.flipped?.includes(`${row},${card}`)) turn = reverse(turn)
  return turn
}

/** Turns one card the other way on one row, or back again. */
export function toggleFlip(design: TabletDesign, row: number, card: number): TabletDesign {
  const key = `${row},${card}`
  const flipped = design.flipped ?? []
  return { ...design, flipped: flipped.includes(key) ? flipped.filter((k) => k !== key) : [...flipped, key] }
}

/** One stitch of the band as it shows on the face: its colour and which way it leans. */
export interface Stitch {
  color: string
  slant: '/' | '\\'
}

export const MAX_CARDS = 60
export const MAX_ROWS = 400

/**
 * Parses a turning sequence like "4F 4B" or "FFFFBBBB" (or a mix) into one turn per row.
 */
export function parseTurns(text: string): Turn[] {
  const turns: Turn[] = []
  for (const part of text
    .toUpperCase()
    .split(/[\s,]+/)
    .filter(Boolean)) {
    const m = part.match(/^(\d*)([FB])$/)
    if (m) {
      const n = m[1] === '' ? 1 : Number(m[1])
      if (n < 1) throw new Error(`"${part}" needs at least one turn`)
      for (let i = 0; i < n; i++) turns.push(m[2] as Turn)
    } else if (/^[FB]+$/.test(part)) turns.push(...(part.split('') as Turn[]))
    else throw new Error(`"${part}" isn't a turn: use F and B with counts, like 4F 4B`)
  }
  if (turns.length === 0) throw new Error('Give at least one turn')
  if (turns.length > MAX_ROWS) throw new Error(`That's ${turns.length} rows; the limit is ${MAX_ROWS}`)
  return turns
}

/** "FFFFBBBB" back to "4F 4B". */
export const formatTurns = (turns: Turn[]) =>
  turns
    .reduce<[Turn, number][]>((runs, t) => {
      const last = runs[runs.length - 1]
      if (last && last[0] === t) last[1]++
      else runs.push([t, 1])
      return runs
    }, [])
    .map(([t, n]) => `${n}${t}`)
    .join(' ')

/**
 * What the face of the band shows, row by row and card by card. Turning forward brings the next hole's thread to
 * the top (A, B, C, D, A …); turning back retraces them, so the pattern mirrors where the turning reverses. An
 * S-threaded card turned forward twists its threads into a Z-twist cord, so its stitches lean like the middle of a
 * Z (/); a Z-threaded card's lean the other way (\), and turning back reverses the lean. Each card follows the
 * pack's turn unless it turns opposite, or is flipped on that row.
 */
export function simulate(design: TabletDesign): Stitch[][] {
  const position = design.cards.map(() => 0)
  return design.turns.map((_, row) =>
    design.cards.map((card, c) => {
      const turn = cardTurn(design, row, c)
      let shown: number
      if (turn === 'F') {
        shown = position[c]
        position[c] = (position[c] + 1) % 4
      } else {
        position[c] = (position[c] + 3) % 4
        shown = position[c]
      }
      const forwardSlant = card.threading === 'S' ? '/' : '\\'
      const slant = turn === 'F' ? forwardSlant : forwardSlant === '/' ? '\\' : '/'
      return { color: card.holes[shown], slant }
    }),
  )
}

/** Each hole's thread is its own warp end: the number of warp ends of each colour. */
export function tabletWarpCounts(cards: Card[]): { color: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const card of cards) for (const c of card.holes) counts.set(c, (counts.get(c) ?? 0) + 1)
  return [...counts].map(([color, count]) => ({ color, count })).sort((a, b) => b.count - a.count)
}

/** Starting designs. */
export const TABLET_PRESETS: { name: string; build: (dark: string, light: string, cards: number) => TabletDesign }[] = [
  {
    name: 'Diagonals',
    // Two dark and two light holes, each card one hole further on, all threaded alike.
    build: (dark, light, n) => ({
      cards: Array.from({ length: n }, (_, c) => ({
        holes: [0, 1, 2, 3].map((h) => ((h + c) % 4 < 2 ? dark : light)) as Card['holes'],
        threading: 'S',
      })),
      turns: parseTurns('16F'),
    }),
  },
  {
    name: 'Chevrons',
    // As diagonals, but the two halves threaded in opposite directions and turning reversing every 8 rows.
    build: (dark, light, n) => ({
      cards: Array.from({ length: n }, (_, c) => {
        const k = c < n / 2 ? c : n - 1 - c
        return {
          holes: [0, 1, 2, 3].map((h) => ((h + k) % 4 < 2 ? dark : light)) as Card['holes'],
          threading: c < n / 2 ? 'S' : 'Z',
        }
      }),
      turns: parseTurns('8F 8B 8F 8B'),
    }),
  },
  {
    name: 'Stripes',
    // Each card one colour all round: plain stripes along the band.
    build: (dark, light, n) => ({
      cards: Array.from({ length: n }, (_, c) => ({
        holes: (Math.floor(c / 2) % 2 === 0 ? [dark, dark, dark, dark] : [light, light, light, light]) as Card['holes'],
        threading: c % 2 === 0 ? 'S' : 'Z',
      })),
      turns: parseTurns('16F'),
    }),
  },
]
