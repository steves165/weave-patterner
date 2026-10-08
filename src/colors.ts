import { advancing, straight } from './tools'
import { type Draft, defaultDraft, parseDraft, resizeDraft } from './weave'

export interface ColorRun {
  color: string
  count: number
}

/** Expands runs like [{red, 4}, {white, 2}] into one colour per thread. */
export const expandRuns = (runs: ColorRun[]) => runs.flatMap((r) => Array<string>(r.count).fill(r.color.toLowerCase()))

/** Repeats a stripe sequence over threads from..to (1-based, inclusive), leaving the rest unchanged. */
export function applyStripes(colors: string[], runs: ColorRun[], from = 1, to = colors.length): string[] {
  if (runs.length === 0 || runs.some((r) => !Number.isInteger(r.count) || r.count < 1))
    throw new Error('Each stripe needs a whole number of threads, at least 1')
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > colors.length || from > to)
    throw new Error(`Choose a range between 1 and ${colors.length}`)
  const seq = expandRuns(runs)
  return colors.map((c, i) => (i + 1 >= from && i + 1 <= to ? seq[(i + 1 - from) % seq.length] : c))
}

/** Reads the colour runs back out of a list of thread colours (for editing an existing stripe). */
export function toRuns(colors: string[]): ColorRun[] {
  const runs: ColorRun[] = []
  for (const c of colors) {
    const last = runs[runs.length - 1]
    if (last && last.color === c) last.count++
    else runs.push({ color: c, count: 1 })
  }
  return runs
}

export interface Preset {
  id: string
  name: string
  description: string
  build: (dark: string, light: string) => Draft
}

/** A draft with the given threading, tie-up rows (per treadle) and treadling repeats, sized to `size`. */
function draftFrom(
  threading: number[],
  tieup: number[][],
  treadling: number[],
  warp: string[],
  weft: string[],
  size = 32,
) {
  const shafts = Math.max(...threading)
  const treadles = tieup.length
  const base = resizeDraft(defaultDraft(), { shafts, treadles })
  return parseDraft({
    ...base,
    ends: size,
    picks: size,
    threading: Array.from({ length: size }, (_, i) => threading[i % threading.length] - 1),
    tieup: Array.from({ length: shafts }, (_, s) =>
      Array.from({ length: treadles }, (_, t) => tieup[t].includes(s + 1)),
    ),
    treadling: Array.from({ length: size }, (_, p) =>
      Array.from({ length: treadles }, (_, t) => treadling[p % treadling.length] === t + 1),
    ),
    warpColors: Array.from({ length: size }, (_, i) => warp[i % warp.length]),
    weftColors: Array.from({ length: size }, (_, i) => weft[i % weft.length]),
  })
}

const twill22 = [
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 1],
]
const plain = [
  [1, 3],
  [2, 4],
]

/** Colour-and-weave classics: the structure plus the colour order that makes the effect. */
export const PRESETS: Preset[] = [
  {
    id: 'houndstooth',
    name: 'Houndstooth',
    description: '2/2 twill, 4 dark and 4 light in warp and weft',
    build: (dark, light) => {
      const order = [...Array(4).fill(dark), ...Array(4).fill(light)]
      return draftFrom(straight(4), twill22, straight(4), order, order)
    },
  },
  {
    id: 'log-cabin',
    name: 'Log cabin',
    description: 'Plain weave, dark/light alternating, swapping phase every 8 threads',
    build: (dark, light) => {
      const order = [...Array(4).fill([dark, light]).flat(), ...Array(4).fill([light, dark]).flat()]
      return draftFrom([1, 2, 3, 4], plain, [1, 2], order, order)
    },
  },
  {
    id: 'gingham',
    name: 'Gingham',
    description: 'Plain weave, 4 dark and 4 light in warp and weft',
    build: (dark, light) => {
      const order = [...Array(4).fill(dark), ...Array(4).fill(light)]
      return draftFrom([1, 2, 3, 4], plain, [1, 2], order, order)
    },
  },
  {
    id: 'broken-twill-check',
    name: 'Broken-twill check',
    description: '8-shaft advancing twill with a 4/4 dark and light check',
    build: (dark, light) => {
      const order = [...Array(4).fill(dark), ...Array(4).fill(light)]
      const tie = Array.from({ length: 8 }, (_, t) => [t + 1, ((t + 1) % 8) + 1, ((t + 2) % 8) + 1, ((t + 3) % 8) + 1])
      const seq = advancing(8, 4, 2)
      return draftFrom(seq, tie, seq, order, order)
    },
  },
]

/** Black or white, whichever reads better on `hex` (WCAG relative luminance). */
export function textOn(hex: string): '#000000' | '#ffffff' {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  // Contrast with black is (L + 0.05) / 0.05 and with white 1.05 / (L + 0.05); they cross at L ≈ 0.179.
  return luminance > 0.179 ? '#000000' : '#ffffff'
}
