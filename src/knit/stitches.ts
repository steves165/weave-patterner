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
  | 'k3tog'
  | 'sssk'
  | 'kfb'
  | 'm1p'
  | 'yo2'
  | 'mb'
  | 'nupp'
  | 'bead'
  | 'rt'
  | 'lt'
  | 'rc21'
  | 'lc21'
  | 'rpc21'
  | 'lpc21'
  | 'rpc2'
  | 'lpc2'
  | 'wt'
  | 'rest'
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
  /** For a cable: which way the front stitches lean, how many there are, and whether the back ones are purled. */
  cross?: 'right' | 'left'
  front?: number
  purlBack?: boolean
  /** Stitches the square leaves on the right needle, when not 1: kfb and a double yarn over make 2. */
  makes?: number
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
    cross: 'right',
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
    cross: 'left',
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
    cross: 'right',
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
    cross: 'left',
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
    cross: 'right',
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
    cross: 'left',
    mirror: 'rc3',
    explain: '3/3 LC (C6F): slip 3 to a cable needle and hold them at the front, k3, k3 from the cable needle.',
  },
  {
    id: 'k3tog',
    name: 'Knit 3 together',
    symbol: '3/',
    rs: 'k3tog',
    ws: 'p3tog',
    uses: 3,
    mirror: 'sssk',
    explain: 'k3tog: knit 3 together, a double decrease leaning right (p3tog on WS rows).',
  },
  {
    id: 'sssk',
    name: 'Slip, slip, slip, knit',
    symbol: '3\\',
    rs: 'sssk',
    ws: 'sssp',
    uses: 3,
    mirror: 'k3tog',
    explain:
      'sssk: slip 3 knitwise one at a time, knit them together through the back loops, a double decrease leaning left (sssp on WS rows).',
  },
  {
    id: 'kfb',
    name: 'Knit front and back',
    symbol: 'KF',
    rs: 'kfb',
    ws: 'pfb',
    uses: 1,
    makes: 2,
    explain: 'kfb: knit into the front and then the back of the stitch, making 2 from 1 (pfb, purlwise, on WS rows).',
  },
  {
    id: 'm1p',
    name: 'Make 1 purlwise',
    symbol: 'MP',
    rs: 'm1p',
    ws: 'm1 knitwise',
    uses: 0,
    explain:
      'm1p: make 1 purlwise, lifting the strand between the needles and purling it through the back (on WS rows, make 1 knitwise).',
  },
  {
    id: 'yo2',
    name: 'Double yarn over',
    symbol: 'O2',
    rs: 'double yo',
    ws: 'double yo',
    uses: 0,
    makes: 2,
    explain:
      'double yo: wrap the yarn twice round the needle, making 2 stitches and a large eyelet; on the next row work (k1, p1) into it.',
  },
  {
    id: 'mb',
    name: 'Bobble',
    symbol: 'B',
    rs: 'MB',
    ws: 'MB',
    uses: 1,
    explain:
      'MB: make bobble. (k1, yo, k1, yo, k1) into the next stitch, turn, p5, turn, k5, then pass the 4 stitches over the first.',
  },
  {
    id: 'nupp',
    name: 'Nupp',
    symbol: 'N',
    rs: 'nupp',
    ws: 'nupp',
    uses: 1,
    explain:
      'nupp: loosely (k1, yo) 3 times, k1, all into the next stitch, making 7; on the next row purl all 7 together.',
  },
  {
    id: 'bead',
    name: 'Place a bead',
    symbol: '◇',
    rs: 'PB',
    ws: 'PB',
    uses: 1,
    explain:
      'PB: place bead. Slide a bead onto the next stitch with a fine crochet hook, return it and work it as charted.',
  },
  {
    id: 'rt',
    name: '1/1 right twist',
    symbol: '',
    rs: 'RT',
    ws: 'RT',
    uses: 1,
    cable: 2,
    cross: 'right',
    mirror: 'lt',
    explain: 'RT: right twist. k2tog without slipping them off, knit the first stitch again, then slip both off.',
  },
  {
    id: 'lt',
    name: '1/1 left twist',
    symbol: '',
    rs: 'LT',
    ws: 'LT',
    uses: 1,
    cable: 2,
    cross: 'left',
    mirror: 'rt',
    explain:
      'LT: left twist. Knit the second stitch through the back loop, then k2tog tbl the first and second, and slip both off.',
  },
  {
    id: 'rc21',
    name: '2/1 right cross',
    symbol: '',
    rs: '2/1 RC',
    ws: '2/1 RC',
    uses: 1,
    cable: 3,
    cross: 'right',
    front: 2,
    mirror: 'lc21',
    explain: '2/1 RC: slip 1 to a cable needle and hold it at the back, k2, k1 from the cable needle.',
  },
  {
    id: 'lc21',
    name: '2/1 left cross',
    symbol: '',
    rs: '2/1 LC',
    ws: '2/1 LC',
    uses: 1,
    cable: 3,
    cross: 'left',
    front: 2,
    mirror: 'rc21',
    explain: '2/1 LC: slip 2 to a cable needle and hold them at the front, k1, k2 from the cable needle.',
  },
  {
    id: 'rpc21',
    name: '2/1 right purl cross',
    symbol: '',
    rs: '2/1 RPC',
    ws: '2/1 RPC',
    uses: 1,
    cable: 3,
    cross: 'right',
    front: 2,
    purlBack: true,
    mirror: 'lpc21',
    explain: '2/1 RPC: slip 1 to a cable needle and hold it at the back, k2, p1 from the cable needle.',
  },
  {
    id: 'lpc21',
    name: '2/1 left purl cross',
    symbol: '',
    rs: '2/1 LPC',
    ws: '2/1 LPC',
    uses: 1,
    cable: 3,
    cross: 'left',
    front: 2,
    purlBack: true,
    mirror: 'rpc21',
    explain: '2/1 LPC: slip 2 to a cable needle and hold them at the front, p1, k2 from the cable needle.',
  },
  {
    id: 'rpc2',
    name: '2/2 right purl cross',
    symbol: '',
    rs: '2/2 RPC',
    ws: '2/2 RPC',
    uses: 1,
    cable: 4,
    cross: 'right',
    purlBack: true,
    mirror: 'lpc2',
    explain: '2/2 RPC: slip 2 to a cable needle and hold them at the back, k2, p2 from the cable needle.',
  },
  {
    id: 'lpc2',
    name: '2/2 left purl cross',
    symbol: '',
    rs: '2/2 LPC',
    ws: '2/2 LPC',
    uses: 1,
    cable: 4,
    cross: 'left',
    purlBack: true,
    mirror: 'rpc2',
    explain: '2/2 LPC: slip 2 to a cable needle and hold them at the front, p2, k2 from the cable needle.',
  },
  {
    id: 'wt',
    name: 'Wrap and turn (short row)',
    symbol: 'W',
    rs: 'w&t',
    ws: 'w&t',
    uses: 1,
    explain:
      'w&t: wrap and turn. Bring the yarn to the other side, slip the next stitch, bring the yarn back, return the stitch to the left needle and turn the work. Mark the rest of the row "left unworked".',
  },
  {
    id: 'rest',
    name: 'Left unworked (short row)',
    symbol: '–',
    rs: '',
    ws: '',
    uses: 1,
    explain: 'Squares marked – are left unworked on a short row: they stay on the needle until a later row works them.',
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

/** Stitches the square leaves on the right needle: one, two for kfb and a double yarn over, none for "no stitch". */
export const makes = (id: StitchId) => (id === 'none' ? 0 : (STITCHES[id].makes ?? 1))
