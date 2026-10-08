import { describe, expect, it } from 'vitest'
import { blankChart, mirror, paint, problems, rowCounts } from './chart'
import { writeRow, writtenPattern } from './instructions'
import { cablePaths, crossing } from './render'
import { makes, STITCHES } from './stitches'

/** A one-row chart with these stitches, given from the right as knitted. */
const row = (...ids: (keyof typeof STITCHES)[]) => {
  let k = blankChart(ids.length, 1)
  ids.forEach((id, i) => {
    k = paint(k, 0, ids.length - 1 - i, { stitch: id })
  })
  return k
}

describe('more stitches', () => {
  it('counts what each uses and makes: double decreases, kfb and a double yarn over', () => {
    expect(rowCounts(['k3tog', 'sssk', 'k'])).toEqual({ uses: 7, makes: 3 })
    expect(rowCounts(['kfb', 'yo2', 'm1p'])).toEqual({ uses: 1, makes: 5 })
    expect(makes('none')).toBe(0)
  })

  it('writes them in the pattern, with their meaning in the key', () => {
    const k = row('k', 'k3tog', 'yo2', 'mb', 'nupp', 'bead', 'kfb', 'm1p')
    expect(writeRow(k, 0)).toBe('k1, k3tog, double yo, MB, nupp, PB, kfb, m1p')
    const pattern = writtenPattern(k)
    expect(pattern).toContain('MB: make bobble')
    expect(pattern).toContain('PB: place bead')
  })

  it('mirrors the double decreases and the new crosses', () => {
    const k = mirror(row('k3tog', 'k', 'k'))
    expect(k.stitch[0]).toEqual(['sssk', 'k', 'k'])
    for (const [a, b] of [
      ['rc21', 'lc21'],
      ['rpc21', 'lpc21'],
      ['rpc2', 'lpc2'],
      ['rt', 'lt'],
    ] as const) {
      expect(STITCHES[a].mirror).toBe(b)
      expect(STITCHES[b].mirror).toBe(a)
    }
  })

  it('draws 2/1 crosses with two stitches in front and one behind, and purl dots behind purl crosses', () => {
    expect(crossing('rc21')).toEqual({ right: true, front: 2, back: 1, purlBack: false })
    expect(crossing('lpc2')).toEqual({ right: false, front: 2, back: 2, purlBack: true })
    // A right cross: the front band starts at the left at the bottom and ends at the right at the top.
    expect(cablePaths('rc21', 30, 10).front).toBe('M 0 10 L 10 0 L 30 0 L 20 10 Z')
    expect(cablePaths('rc21', 30, 10).dots).toEqual([])
    expect(cablePaths('rpc21', 30, 10).dots).toHaveLength(2)
    // 2/1 cables are written as one crossing over 3 squares.
    expect(writeRow(row('rc21', 'rc21', 'rc21', 'p'), 0)).toBe('2/1 RC, p1')
  })

  it('writes a short row up to the turn, saying how many stitches are left unworked, and keeps the counts', () => {
    // From the right: k3, wrap and turn, then 2 stitches left on the needle.
    const k = row('k', 'k', 'k', 'wt', 'rest', 'rest')
    expect(writeRow(k, 0)).toBe('k3, w&t (2 sts left unworked)')
    const two = { ...blankChart(6, 2), stitch: [k.stitch[0], [...blankChart(6, 1).stitch[0]]] }
    expect(problems(two)).toEqual([])
  })
})
