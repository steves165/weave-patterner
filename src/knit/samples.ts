import { blankChart, type KnitChart } from './chart'
import type { StitchId } from './stitches'

/** Chart squares as letters, for writing samples: one string per row, drawn top row first as on paper. */
const CODES: Record<string, StitchId> = {
  '.': 'k',
  '-': 'p',
  o: 'yo',
  '/': 'k2tog',
  '\\': 'ssk',
  A: 'cdd',
  x: 'none',
  v: 'sl',
  t: 'ktbl',
  R: 'rc2',
  L: 'lc2',
  r: 'rc1',
  l: 'lc1',
}

/** Builds a chart from rows of stitch letters (and optionally colour digits), top row first. */
export function chartFrom(stitches: string[], colors?: string[], palette?: string[]): KnitChart {
  const base = blankChart(stitches[0].length, stitches.length, palette)
  return {
    ...base,
    stitch: [...stitches].reverse().map((row) => [...row].map((ch) => CODES[ch] ?? 'k')),
    color: colors ? [...colors].reverse().map((row) => [...row].map(Number)) : base.color,
  }
}

export interface Sample {
  name: string
  about: string
  chart: () => KnitChart
}

export const SAMPLES: Sample[] = [
  {
    name: '2×2 rib',
    about: 'Knit 2, purl 2: stretchy, for cuffs and hems.',
    chart: () => chartFrom(['--..--..--..', '--..--..--..']),
  },
  {
    name: 'Seed stitch',
    about: 'Knits and purls alternating every stitch and row: flat, textured and reversible.',
    chart: () => chartFrom(['-.-.-.-.-.-', '.-.-.-.-.-.']),
  },
  {
    name: 'Cable panel',
    about: 'A 2/2 right cross every sixth row, between purl stitches.',
    chart: () => chartFrom([...Array(5).fill('--....--....--'), '--RRRR--RRRR--']),
  },
  {
    name: 'Feather and fan',
    about: 'Old Shale lace: decreases and yarn overs that scallop the fabric.',
    chart: () =>
      chartFrom([
        '------------------------------------',
        '///.o.o.o.o.o.o//////.o.o.o.o.o.o///',
        '....................................',
        '....................................',
      ]),
  },
  {
    name: 'Eyelet lace',
    about: 'Staggered yarn overs, each paired with a decrease to keep the count.',
    chart: () => chartFrom(['............', '..o/...o/...', '............', 'o/...o/...o/']),
  },
  {
    name: 'Fair Isle peerie',
    about: 'A small two-colour diamond for stranded colourwork, knitted in the round.',
    chart: () => ({
      ...chartFrom(
        Array(7).fill('................'),
        [
          '0001000100010001',
          '0010100000101000',
          '0100010001000100',
          '1000001010000010',
          '0100010001000100',
          '0010100000101000',
          '0001000100010001',
        ],
        ['#f2ead8', '#8b2e2e'],
      ),
      mode: 'round',
    }),
  },
]
