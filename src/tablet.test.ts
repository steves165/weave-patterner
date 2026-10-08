import { describe, expect, it } from 'vitest'
import {
  type Card,
  cardTurn,
  formatTurns,
  parseTurns,
  simulate,
  TABLET_PRESETS,
  tabletWarpCounts,
  toggleFlip,
} from './tablet'

const card = (holes: string, threading: 'S' | 'Z' = 'S'): Card => ({
  holes: holes.split('') as Card['holes'],
  threading,
})

describe('tablet weaving', () => {
  it('reads turning sequences', () => {
    expect(parseTurns('2F 3b')).toEqual(['F', 'F', 'B', 'B', 'B'])
    expect(parseTurns('FFB, F')).toEqual(['F', 'F', 'B', 'F'])
    expect(formatTurns(parseTurns('FFFFBB'))).toBe('4F 2B')
    expect(() => parseTurns('4X')).toThrow(/isn't a turn/)
    expect(() => parseTurns('')).toThrow(/at least one/)
    expect(() => parseTurns('401F')).toThrow(/limit is 400/)
  })

  it('shows the holes in turn going forward, and mirrors them going back', () => {
    const rows = simulate({ cards: [card('abcd')], turns: parseTurns('4F 4B') })
    expect(rows.map((r) => r[0].color).join('')).toBe('abcddcba')
  })

  it('leans S and Z stitches opposite ways, and reverses the lean when turning back', () => {
    const rows = simulate({ cards: [card('aaaa', 'S'), card('aaaa', 'Z')], turns: parseTurns('F B') })
    expect(rows.map((r) => r.map((s) => s.slant).join(''))).toEqual(['/\\', '\\/'])
  })

  it('counts warp ends by colour, one per hole', () => {
    expect(tabletWarpCounts([card('aabb'), card('abbb')])).toEqual([
      { color: 'b', count: 5 },
      { color: 'a', count: 3 },
    ])
  })

  it('builds the presets', () => {
    for (const p of TABLET_PRESETS) {
      const d = p.build('#000000', '#ffffff', 12)
      expect(d.cards).toHaveLength(12)
      expect(simulate(d)).toHaveLength(d.turns.length)
    }
    // Diagonals: each row shifts the pattern one card along.
    const rows = simulate(TABLET_PRESETS[0].build('d', 'l', 4))
    expect(rows.slice(0, 2).map((r) => r.map((s) => s.color).join(''))).toEqual(['ddll', 'dlld'])
  })
})

describe('turning cards individually', () => {
  it('turns an opposite card against the pack on every row', () => {
    const cards = [card('abcd'), { ...card('abcd'), opposite: true }]
    const rows = simulate({ cards, turns: parseTurns('3F') })
    expect(rows.map((r) => r.map((s) => s.color).join(''))).toEqual(['ad', 'bc', 'cb'])
    expect(cardTurn({ cards, turns: ['F'] }, 0, 1)).toBe('B')
  })

  it('flips a single card on a single row, and back again', () => {
    const d = { cards: [card('abcd'), card('abcd')], turns: parseTurns('3F') }
    const flipped = toggleFlip(d, 1, 0)
    expect(cardTurn(flipped, 1, 0)).toBe('B')
    expect(cardTurn(flipped, 1, 1)).toBe('F')
    // Card 1 goes a, then back to a (turned back on row 2), then a again.
    expect(
      simulate(flipped)
        .map((r) => r[0].color)
        .join(''),
    ).toBe('aaa')
    expect(toggleFlip(flipped, 1, 0).flipped).toEqual([])
  })

  it('matches the usual convention: S threaded and turned forward makes a Z twist, leaning /', () => {
    expect(simulate({ cards: [card('aaaa', 'S')], turns: ['F'] })[0][0].slant).toBe('/')
    expect(simulate({ cards: [card('aaaa', 'Z')], turns: ['F'] })[0][0].slant).toBe('\\')
  })
})
