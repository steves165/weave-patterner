/**
 * The stitches a chart can hold. Each chart square shows how the stitch looks from the right side, so a square has
 * one meaning on right-side rows and its opposite on wrong-side rows (a knit square is purled from the wrong side).
 */
export type StitchId =
  | 'k'
  | 'p'
  | 'ktbl'
  | 'sl'
  | 'yo'
  | 'm1l'
  | 'm1r'
  | 'k2tog'
  | 'ssk'
  | 'cdd'
  | 'rc1'
  | 'lc1'
  | 'rc2'
  | 'lc2'
  | 'rc3'
  | 'lc3'
  | 'none'

export interface Stitch {
  id: StitchId
  name: string
  /** The chart symbol (cables are drawn across their squares instead). */
  symbol: string
  /** Written on right-side rows, and on every round. */
  rs: string
  /** Written on wrong-side rows of flat knitting. */
  ws: string
  /** Stitches taken off the left needle per square: a decrease works 2 or 3, a yarn over or make 1 none. */
  uses: number
  /** For a cable: how many squares one crossing takes. */
  cable?: number
  /** Whether runs of it are written with a count, as in "k3" (otherwise "yo twice", "(k2tog) 3 times"). */
  counted?: boolean
  /** The mirror-image stitch, for flipping a chart left to right. */
  mirror?: StitchId
  /** What the abbreviation means, for the pattern's key. */
  explain: string
}

const list: Stitch[] = [
  {
    id: 'k',
    name: 'Knit',
    symbol: '',
    rs: 'k',
    ws: 'p',
    uses: 1,
    counted: true,
    explain: 'k: knit. Shown as an empty square: knit on RS rows, purl on WS rows.',
  },
  {
    id: 'p',
    name: 'Purl',
    symbol: '•',
    rs: 'p',
    ws: 'k',
    uses: 1,
    counted: true,
    explain: 'p: purl. Shown as a dot: purl on RS rows, knit on WS rows.',
  },
  {
    id: 'ktbl',
    name: 'Knit through the back loop',
    symbol: 'ℓ',
    rs: 'k1 tbl',
    ws: 'p1 tbl',
    uses: 1,
    explain: 'k1 tbl: knit through the back loop, twisting the stitch (p1 tbl on WS rows).',
  },
  {
    id: 'sl',
    name: 'Slip',
    symbol: 'V',
    rs: 'sl wyib',
    ws: 'sl wyif',
    uses: 1,
    counted: true,
    explain: 'sl wyib / sl wyif: slip purlwise with the yarn at the back of the work (yarn in front on WS rows).',
  },
  {
    id: 'yo',
    name: 'Yarn over',
    symbol: 'O',
    rs: 'yo',
    ws: 'yo',
    uses: 0,
    explain: 'yo: yarn over, making a new stitch and an eyelet.',
  },
  {
    id: 'm1l',
    name: 'Make 1 left',
    symbol: 'ML',
    rs: 'm1l',
    ws: 'm1lp',
    uses: 0,
    mirror: 'm1r',
    explain:
      'm1l: make 1 left, lifting the strand between the needles from the front and knitting it through the back (m1lp purlwise on WS rows).',
  },
  {
    id: 'm1r',
    name: 'Make 1 right',
    symbol: 'MR',
    rs: 'm1r',
    ws: 'm1rp',
    uses: 0,
    mirror: 'm1l',
    explain:
      'm1r: make 1 right, lifting the strand between the needles from the back and knitting it through the front (m1rp purlwise on WS rows).',
  },
  {
    id: 'k2tog',
    name: 'Knit 2 together',
    symbol: '/',
    rs: 'k2tog',
    ws: 'p2tog',
    uses: 2,
    mirror: 'ssk',
    explain: 'k2tog: knit 2 together, a decrease leaning right (p2tog on WS rows).',
  },
  {
    id: 'ssk',
    name: 'Slip, slip, knit',
    symbol: '\\',
    rs: 'ssk',
    ws: 'ssp',
    uses: 2,
    mirror: 'k2tog',
    explain:
      'ssk: slip 2 knitwise one at a time, knit them together through the back loops, a decrease leaning left (ssp on WS rows).',
  },
  {
    id: 'cdd',
    name: 'Centred double decrease',
    symbol: 'Λ',
    rs: 'cdd',
    ws: 'cdd purlwise',
    uses: 3,
    explain:
      'cdd: centred double decrease. Slip 2 together knitwise, k1, pass the 2 slipped stitches over (on WS rows: slip 2 together through the back loops purlwise, p1, pass the slipped stitches over).',
  },
  {
    id: 'rc1',
    name: '1/1 right cross',
    symbol: '',
    rs: '1/1 RC',
    ws: '1/1 RC',
    uses: 1,
    cable: 2,
    mirror: 'lc1',
    explain: '1/1 RC: slip 1 to a cable needle and hold it at the back, k1, k1 from the cable needle.',
  },
  {
    id: 'lc1',
    name: '1/1 left cross',
    symbol: '',
    rs: '1/1 LC',
    ws: '1/1 LC',
    uses: 1,
    cable: 2,
    mirror: 'rc1',
    explain: '1/1 LC: slip 1 to a cable needle and hold it at the front, k1, k1 from the cable needle.',
  },
  {
    id: 'rc2',
    name: '2/2 right cross',
    symbol: '',
    rs: '2/2 RC',
    ws: '2/2 RC',
    uses: 1,
    cable: 4,
    mirror: 'lc2',
    explain: '2/2 RC (C4B): slip 2 to a cable needle and hold them at the back, k2, k2 from the cable needle.',
  },
  {
    id: 'lc2',
    name: '2/2 left cross',
    symbol: '',
    rs: '2/2 LC',
    ws: '2/2 LC',
    uses: 1,
    cable: 4,
    mirror: 'rc2',
    explain: '2/2 LC (C4F): slip 2 to a cable needle and hold them at the front, k2, k2 from the cable needle.',
  },
  {
    id: 'rc3',
    name: '3/3 right cross',
    symbol: '',
    rs: '3/3 RC',
    ws: '3/3 RC',
    uses: 1,
    cable: 6,
    mirror: 'lc3',
    explain: '3/3 RC (C6B): slip 3 to a cable needle and hold them at the back, k3, k3 from the cable needle.',
  },
  {
    id: 'lc3',
    name: '3/3 left cross',
    symbol: '',
    rs: '3/3 LC',
    ws: '3/3 LC',
    uses: 1,
    cable: 6,
    mirror: 'rc3',
    explain: '3/3 LC (C6F): slip 3 to a cable needle and hold them at the front, k3, k3 from the cable needle.',
  },
  {
    id: 'none',
    name: 'No stitch',
    symbol: '',
    rs: '',
    ws: '',
    uses: 0,
    explain:
      'Grey squares are "no stitch": placeholders where stitches have been decreased away or not yet made. Skip them.',
  },
]

export const STITCHES = Object.fromEntries(list.map((s) => [s.id, s])) as Record<StitchId, Stitch>
export const STITCH_IDS = list.map((s) => s.id)

export const isStitchId = (v: unknown): v is StitchId => typeof v === 'string' && v in STITCHES

/** Stitches the square leaves on the right needle: one, except for "no stitch". */
export const makes = (id: StitchId) => (id === 'none' ? 0 : 1)
