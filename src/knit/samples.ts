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

/** Kinds of sample, for linking each chart page to its neighbours. */
export type SampleFamily = 'texture' | 'lace' | 'colourwork'

export interface Sample {
  name: string
  family: SampleFamily
  about: string
  chart: () => KnitChart
}

export const SAMPLES: Sample[] = [
  {
    name: '2×2 rib',
    family: 'texture',
    about: 'Knit 2, purl 2: stretchy, for cuffs and hems.',
    chart: () => chartFrom(['--..--..--..', '--..--..--..']),
  },
  {
    name: 'Seed stitch',
    family: 'texture',
    about: 'Knits and purls alternating every stitch and row: flat, textured and reversible.',
    chart: () => chartFrom(['-.-.-.-.-.-', '.-.-.-.-.-.']),
  },
  {
    name: 'Cable panel',
    family: 'texture',
    about: 'A 2/2 right cross every sixth row, between purl stitches.',
    chart: () => chartFrom([...Array(5).fill('--....--....--'), '--RRRR--RRRR--']),
  },
  {
    name: 'Feather and fan',
    family: 'lace',
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
    family: 'lace',
    about: 'Staggered yarn overs, each paired with a decrease to keep the count.',
    chart: () => chartFrom(['............', '..o/...o/...', '............', 'o/...o/...o/']),
  },
  {
    name: 'Fair Isle peerie',
    family: 'colourwork',
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
  {
    name: 'Houndstooth',
    family: 'colourwork',
    about: 'The classic broken check in two colours, on a 4-stitch, 4-round repeat.',
    chart: () => ({
      ...chartFrom(
        Array(8).fill('................'),
        [
          '1000100010001000',
          '1100110011001100',
          '1110111011101110',
          '0111011101110111',
          '1000100010001000',
          '1100110011001100',
          '1110111011101110',
          '0111011101110111',
        ],
        ['#f2ead8', '#2b2b2b'],
      ),
      mode: 'round',
    }),
  },
  {
    name: 'Heart',
    family: 'colourwork',
    about: 'A row of hearts in two colours: for yokes, hats, mittens and Valentine knits.',
    chart: () => ({
      ...chartFrom(
        Array(8).fill('..................'),
        [
          '000000000000000000',
          '001101100001101100',
          '011111110011111110',
          '011111110011111110',
          '001111100001111100',
          '000111000000111000',
          '000010000000010000',
          '000000000000000000',
        ],
        ['#f2ead8', '#c2185b'],
      ),
      mode: 'round',
    }),
  },
  {
    name: 'Nordic star',
    family: 'colourwork',
    about: 'The eight-pointed Selbu star, a 17-stitch motif for mittens, hats and jumpers.',
    chart: () => ({
      ...chartFrom(
        Array(17).fill('.................'),
        [
          '00000000000000000',
          '00000000100000000',
          '00000001110000000',
          '00011111111111000',
          '00010111111101000',
          '00011011111011000',
          '00011101110111000',
          '00111110101111100',
          '01111111111111110',
          '00111110101111100',
          '00011101110111000',
          '00011011111011000',
          '00010111111101000',
          '00011111111111000',
          '00000001110000000',
          '00000000100000000',
          '00000000000000000',
        ],
        ['#f2ead8', '#1f2a44'],
      ),
      mode: 'round',
    }),
  },
  {
    name: 'Snowflake peerie',
    family: 'colourwork',
    about: 'A small snowflake for a band of stranded colourwork, light on dark.',
    chart: () => ({
      ...chartFrom(
        Array(9).fill('............'),
        [
          '000010000000',
          '010010010000',
          '001010100000',
          '000111000000',
          '111111111000',
          '000111000000',
          '001010100000',
          '010010010000',
          '000010000000',
        ],
        ['#1f2a44', '#f2ead8'],
      ),
      mode: 'round',
    }),
  },
  {
    name: 'OXO peerie',
    family: 'colourwork',
    about: 'The traditional Fair Isle O and X, side by side on a 16-stitch repeat.',
    chart: () => ({
      ...chartFrom(
        Array(7).fill('................'),
        [
          '0011110011000011',
          '0010010001100110',
          '0100001000111100',
          '0100001000011000',
          '0100001000111100',
          '0010010001100110',
          '0011110011000011',
        ],
        ['#f2ead8', '#2e5e4e'],
      ),
      mode: 'round',
    }),
  },
  {
    name: 'Chevron',
    family: 'colourwork',
    about: 'Two-colour zigzag stripes on an 8-stitch repeat: easy stranded colourwork.',
    chart: () => ({
      ...chartFrom(
        Array(8).fill('................'),
        [
          '0111111101111111',
          '0011111000111110',
          '0001110000011100',
          '0000100000001000',
          '1000000010000000',
          '1100000111000001',
          '1110001111100011',
          '1111011111110111',
        ],
        ['#f2ead8', '#b23a48'],
      ),
      mode: 'round',
    }),
  },
  {
    name: 'Basketweave',
    family: 'texture',
    about: 'Blocks of 4 knit and 4 purl stitches, swapping every 4 rows: a woven look in one colour.',
    chart: () => chartFrom([...Array(4).fill('----....----....'), ...Array(4).fill('....----....----')]),
  },
  {
    name: 'Double moss',
    family: 'texture',
    about: 'Knit 2, purl 2, swapping every 2 rows: a checked texture that lies flat. Double seed stitch in the US.',
    chart: () => chartFrom(['--..--..--..', '--..--..--..', '..--..--..--', '..--..--..--']),
  },
]

/** A sample's name for links (#sample=cable-panel) and its page: lower case, words joined by hyphens. */
export const sampleSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
