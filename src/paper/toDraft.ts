/**
 * A weaving draft from a scanned sheet: the squares inked on the grid are where the warp shows, and the threading,
 * tie-up and treadling are worked out from that cloth (fewest shafts and treadles). The warp and weft colours come
 * from the colour strips where they were coloured in, or else from the ink used on the grid.
 */
import { draftFromCloth } from '../analysis'
import { type Draft, emptyDraft } from '../weave'
import { deltaE, type RGB, type Scan } from './scan'

const rgb = (hex: string): RGB => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as RGB

/** The pale colour blank squares (weft) take when the weft strip wasn't coloured. */
export const PAPER_WEFT = '#f4efe6'
/** The colour inked squares take when nothing says otherwise. */
const DEFAULT_WARP = '#2b2b2b'

export interface FromScan {
  draft: Draft
  name: string
  /** Squares read as warp, and as weft. */
  warp: number
  weft: number
  /** Colours used, from the paper. */
  colours: string[]
}

/** The draft a scanned sheet describes. */
export function draftFromScan(scan: Scan): FromScan {
  const { spec, cells, palette } = scan
  const colourOf = (i: number) => (i >= 0 ? palette[i] : null)
  const most = (xs: number[]) => {
    const count = new Map<number, number>()
    for (const x of xs) if (x >= 0) count.set(x, (count.get(x) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1
  }
  const warpStrip = scan.warp.map((s) => (s.marked ? s.colour : -1))
  const weftStrip = scan.weft.map((s) => (s.marked ? s.colour : -1))
  const anyBlank = cells.some((row) => row.some((s) => !s.marked))

  // Which squares show warp.
  let lightest = -1
  if (!anyBlank && weftStrip.every((c) => c < 0)) {
    // Every square inked and no weft colours given: the lightest ink is the weft.
    let best = -1
    for (const [i, c] of palette.entries()) {
      const l = deltaE(rgb(c), [0, 0, 0])
      if (l > best) {
        best = l
        lightest = i
      }
    }
  }
  const cloth = cells.map((row, p) =>
    row.map((s, e) => {
      if (!s.marked) return false
      if (s.colour === lightest && palette.length > 1) return false
      const w = colourOf(warpStrip[e])
      const f = colourOf(weftStrip[p])
      // Coloured like the pick's weft (and not its end's warp): weft shows there.
      if (f && s.colour === weftStrip[p] && s.colour !== warpStrip[e]) return false
      if (f && w) {
        const c = rgb(palette[s.colour])
        return deltaE(c, rgb(w)) <= deltaE(c, rgb(f))
      }
      return true
    }),
  )

  const warpColors = Array.from({ length: spec.ends }, (_, e) => {
    const strip = colourOf(warpStrip[e])
    if (strip) return strip
    const inked = most(cells.map((row, p) => (cloth[p][e] ? row[e].colour : -1)))
    return colourOf(inked) ?? colourOf(most(cells.flat().map((s) => s.colour))) ?? DEFAULT_WARP
  })
  const weftColors = Array.from({ length: spec.picks }, (_, p) => {
    const strip = colourOf(weftStrip[p])
    if (strip) return strip
    // Weft squares inked in a colour (a fully coloured drawing): that colour.
    const inked = most(cells[p].map((s, e) => (!cloth[p][e] && s.marked ? s.colour : -1)))
    return colourOf(inked) ?? PAPER_WEFT
  })
  const base: Draft = { ...emptyDraft(), warpColors, weftColors }
  const warp = cloth.flat().filter(Boolean).length
  if (warp === 0) throw new Error('Nothing was drawn on the grid: fill in the squares where the warp shows.')
  const draft = draftFromCloth(cloth, base)
  return {
    draft,
    name: spec.name,
    warp,
    weft: spec.ends * spec.picks - warp,
    colours: [...new Set([...warpColors, ...weftColors])],
  }
}
