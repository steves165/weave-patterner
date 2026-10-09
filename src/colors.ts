import { advancing, point, straight } from './tools'
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
  /** Uses the accent colour as well as dark and light. */
  accent?: boolean
  build: (dark: string, light: string, accent?: string) => Draft
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
const twill31 = [
  [1, 2, 3],
  [2, 3, 4],
  [3, 4, 1],
  [4, 1, 2],
]
const plain = [
  [1, 3],
  [2, 4],
]
/** `n` threads of one colour. */
const run = (color: string, n: number): string[] => Array(n).fill(color)
/** A colour order repeated `times`. */
const times = (order: string[], n: number): string[] => Array.from({ length: n }, () => order).flat()
/** 2/2 basket weave: pairs of ends and picks work together. */
const basket = { threading: [1, 1, 2, 2], tieup: [[1], [2]], treadling: [1, 1, 2, 2] }
/** Herringbone: a 2/2 twill threading that turns every 8 ends, with a break so the zigzag is clean. */
const herringbone = [1, 2, 3, 4, 1, 2, 3, 4, 2, 1, 4, 3, 2, 1, 4, 3]

/**
 * Colour-and-weave classics, and the standard checks and stripes: the structure plus the colour order that makes
 * the effect. Colours: dark, light, and (some) an accent.
 */
export const PRESETS: Preset[] = [
  {
    id: 'houndstooth',
    name: 'Houndstooth',
    description: '2/2 twill, 4 dark and 4 light in warp and weft',
    build: (dark, light) => {
      const order = [...run(dark, 4), ...run(light, 4)]
      return draftFrom(straight(4), twill22, straight(4), order, order)
    },
  },
  {
    id: 'puppytooth',
    name: 'Puppytooth',
    description: 'A small houndstooth: 2/2 twill, 2 dark and 2 light',
    build: (dark, light) => {
      const order = [...run(dark, 2), ...run(light, 2)]
      return draftFrom(straight(4), twill22, straight(4), order, order)
    },
  },
  {
    id: 'glen-check',
    name: 'Glen check',
    description: 'Prince of Wales check: 2/2 twill, blocks of 4-and-4 houndstooth beside 2-and-2 puppytooth',
    build: (dark, light) => {
      const order = [...times([...run(dark, 4), ...run(light, 4)], 4), ...times([...run(dark, 2), ...run(light, 2)], 8)]
      return draftFrom(straight(4), twill22, straight(4), order, order, 64)
    },
  },
  {
    id: 'gun-club',
    name: 'Gun club check',
    accent: true,
    description: '2/2 twill: a light ground checked with dark and accent in turn, 4 threads each',
    build: (dark, light, accent = dark) => {
      const order = [...run(light, 4), ...run(dark, 4), ...run(light, 4), ...run(accent, 4)]
      return draftFrom(straight(4), twill22, straight(4), order, order)
    },
  },
  {
    id: 'log-cabin',
    name: 'Log cabin',
    description: 'Plain weave, dark/light alternating, swapping phase every 8 threads',
    build: (dark, light) => {
      const order = [...times([dark, light], 4), ...times([light, dark], 4)]
      return draftFrom([1, 2, 3, 4], plain, [1, 2], order, order)
    },
  },
  {
    id: 'hairline',
    name: 'Hairline stripes',
    description: 'Plain weave, 1 dark and 1 light in warp and weft: fine lines across the cloth',
    build: (dark, light) => draftFrom([1, 2, 3, 4], plain, [1, 2], [dark, light], [dark, light]),
  },
  {
    id: 'gingham',
    name: 'Gingham',
    description: 'Plain weave, 4 dark and 4 light in warp and weft',
    build: (dark, light) => {
      const order = [...run(dark, 4), ...run(light, 4)]
      return draftFrom([1, 2, 3, 4], plain, [1, 2], order, order)
    },
  },
  {
    id: 'buffalo',
    name: 'Buffalo check',
    description: 'A bold check: 2/2 twill, 8 dark and 8 light in warp and weft',
    build: (dark, light) => {
      const order = [...run(dark, 8), ...run(light, 8)]
      return draftFrom(straight(4), twill22, straight(4), order, order)
    },
  },
  {
    id: 'windowpane',
    name: 'Windowpane',
    description: '2/2 twill on a light ground, with 2 dark threads every 16 in warp and weft',
    build: (dark, light) => {
      const order = [...run(dark, 2), ...run(light, 14)]
      return draftFrom(straight(4), twill22, straight(4), order, order)
    },
  },
  {
    id: 'tattersall',
    name: 'Tattersall',
    accent: true,
    description: 'Plain weave on a light ground, with lines of dark and accent in turn, 8 threads apart',
    build: (dark, light, accent = dark) => {
      const order = [...run(dark, 2), ...run(light, 6), ...run(accent, 2), ...run(light, 6)]
      return draftFrom([1, 2, 3, 4], plain, [1, 2], order, order)
    },
  },
  {
    id: 'basket-check',
    name: 'Basket check',
    description: '2/2 basket weave, 4 dark and 4 light in warp and weft: a stepped check',
    build: (dark, light) => {
      const order = [...run(dark, 4), ...run(light, 4)]
      return draftFrom(basket.threading, basket.tieup, basket.treadling, order, order)
    },
  },
  {
    id: 'pinstripe',
    name: 'Pinstripe',
    description: '2/2 twill in dark, with a light end every 8 in the warp: suiting stripes',
    build: (dark, light) => draftFrom(straight(4), twill22, straight(4), [...run(dark, 7), light], [dark]),
  },
  {
    id: 'herringbone',
    name: 'Herringbone',
    description: '2/2 twill turning every 8 ends, dark warp and light weft',
    build: (dark, light) => draftFrom(herringbone, twill22, straight(4), [dark], [light]),
  },
  {
    id: 'birds-eye',
    name: 'Bird’s eye',
    description: 'Point twill threaded and treadled 1 2 3 4 3 2: small diamonds, dark warp and light weft',
    build: (dark, light) => draftFrom(point(4), twill22, point(4), [dark], [light], 36),
  },
  {
    id: 'denim',
    name: 'Denim',
    description: '3/1 twill: dark warp on the face, light weft on the back',
    build: (dark, light) => draftFrom(straight(4), twill31, straight(4), [dark], [light]),
  },
  {
    id: 'broken-twill-check',
    name: 'Broken-twill check',
    description: '8-shaft advancing twill with a 4/4 dark and light check',
    build: (dark, light) => {
      const order = [...run(dark, 4), ...run(light, 4)]
      const tie = Array.from({ length: 8 }, (_, t) => [t + 1, ((t + 1) % 8) + 1, ((t + 2) % 8) + 1, ((t + 3) % 8) + 1])
      const seq = advancing(8, 4, 2)
      return draftFrom(seq, tie, seq, order, order)
    },
  },
]

/** Black or white, whichever reads better on `hex` (WCAG relative luminance). */
export function textOn(hex: string): '#000000' | '#ffffff' {
  const luminance = relativeLuminance(hex)
  // Contrast with black is (L + 0.05) / 0.05 and with white 1.05 / (L + 0.05); they cross at L ≈ 0.179.
  return luminance > 0.179 ? '#000000' : '#ffffff'
}

/** WCAG relative luminance of a #rrggbb colour: 0 for black, 1 for white. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Two colours as [dark, light]: the darker one first. */
export const darkAndLight = (a: string, b: string): [string, string] =>
  relativeLuminance(a) <= relativeLuminance(b) ? [a, b] : [b, a]
