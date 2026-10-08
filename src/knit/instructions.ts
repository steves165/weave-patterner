import { cablesIn, castOn, colorLetter, isRightSide, type KnitChart, label, rowCounts, usedColors } from './chart'
import { STITCHES, type StitchId } from './stitches'

/** One stitch (or one cable crossing) as worked, in knitting order. */
interface Token {
  text: string
  /** The colour's letter, in colourwork. */
  color: string | null
  counted: boolean
  uses: number
}

const same = (a: Token, b: Token) => a.text === b.text && a.color === b.color

/**
 * The stitches of row r in the order they're worked: right to left on right-side rows and rounds, left to right on
 * wrong-side rows, where each square is worked as its wrong-side opposite. "No stitch" squares are skipped and a
 * cable is one step.
 */
export function rowTokens(k: KnitChart, r: number, colored = usedColors(k).length > 1): Token[] {
  const row = k.stitch[r]
  const rs = isRightSide(k, r)
  const cableAt = new Map(cablesIn(row).map((c) => [c.start, c]))
  const steps: { id: StitchId; c: number; uses: number }[] = []
  for (let c = 0; c < row.length; ) {
    const cable = cableAt.get(c)
    if (cable) {
      steps.push({ id: cable.id, c, uses: cable.width })
      c += cable.width
    } else {
      if (row[c] !== 'none') steps.push({ id: row[c], c, uses: STITCHES[row[c]].uses })
      c++
    }
  }
  if (rs) steps.reverse()
  return steps.map(({ id, c, uses }) => ({
    text: rs ? STITCHES[id].rs : STITCHES[id].ws,
    color: colored ? colorLetter(k.color[r][c]) : null,
    counted: Boolean(STITCHES[id].counted),
    uses,
  }))
}

/** A run of the same stitch: "k3", "sl2 wyib", "yo twice", "(k2tog) 3 times"; with its colour in colourwork. */
function run(t: Token, n: number): string {
  let text: string
  if (t.counted) {
    const [first, ...rest] = t.text.split(' ')
    text = [`${first}${n}`, ...rest].join(' ')
  } else if (n === 1) text = t.text
  else {
    const what = t.text.includes(' ') ? `(${t.text})` : t.text
    text = n === 2 ? `${what} twice` : `${what} ${n} times`
  }
  return t.color ? `${text} ${t.color}` : text
}

/** Tokens written out with runs counted, and repeated groups in brackets: "(k2tog) 3 times, (yo, k1) 6 times". */
export function writeTokens(tokens: Token[]): string {
  const rep = findRepeat(tokens)
  if (!rep) return writeRuns(tokens)
  const unit = tokens.slice(rep.start, rep.start + rep.unit)
  const group = `(${writeTokens(unit)}) ${rep.count === 2 ? 'twice' : `${rep.count} times`}`
  return [writeTokens(tokens.slice(0, rep.start)), group, writeTokens(tokens.slice(rep.start + rep.unit * rep.count))]
    .filter(Boolean)
    .join(', ')
}

function writeRuns(tokens: Token[]): string {
  const out: string[] = []
  for (let i = 0; i < tokens.length; ) {
    let j = i
    while (j < tokens.length && same(tokens[j], tokens[i])) j++
    out.push(run(tokens[i], j - i))
    i = j
  }
  return out.join(', ')
}

const runsIn = (tokens: Token[]) => tokens.filter((t, i) => i === 0 || !same(t, tokens[i - 1])).length

/**
 * The best repeat in a row: the stretch `unit` tokens long repeated `count` times from `start`, covering the most
 * stitches. Only units with more than one kind of stitch count (a run of knits is just "k10"). Null if none.
 */
export function findRepeat(tokens: Token[]): { start: number; unit: number; count: number } | null {
  let best: { start: number; unit: number; count: number } | null = null
  const n = tokens.length
  for (let unit = 2; unit * 2 <= n; unit++) {
    for (let start = 0; start + unit * 2 <= n; start++) {
      if (runsIn(tokens.slice(start, start + unit)) < 2) continue
      let count = 1
      while (start + (count + 1) * unit <= n) {
        const at = start + count * unit
        let match = true
        for (let i = 0; i < unit && match; i++) match = same(tokens[at + i], tokens[start + i])
        if (!match) break
        count++
      }
      if (count >= 2 && (!best || count * unit > best.count * best.unit)) best = { start, unit, count }
    }
  }
  return best
}

/** A row in words: "*k2, p2; rep from * to last 2 sts, k2". */
export function writeRow(k: KnitChart, r: number, colored = usedColors(k).length > 1): string {
  const tokens = rowTokens(k, r, colored)
  if (tokens.length === 0) return 'no stitches'
  const rep = findRepeat(tokens)
  if (!rep) return writeTokens(tokens)
  const before = tokens.slice(0, rep.start)
  const unit = tokens.slice(rep.start, rep.start + rep.unit)
  const after = tokens.slice(rep.start + rep.unit * rep.count)
  const left = after.reduce((n, t) => n + t.uses, 0)
  const parts = [...(before.length ? [`${writeTokens(before)}, `] : []), `*${writeTokens(unit)}; rep from *`]
  if (after.length === 0) parts.push(' to end')
  else if (left === 0) parts.push(` to end, ${writeTokens(after)}`)
  else parts.push(` to last ${left === 1 ? 'st' : `${left} sts`}, ${writeTokens(after)}`)
  return parts.join('')
}

export interface WrittenRow {
  row: number
  label: string
  side: 'RS' | 'WS' | null
  text: string
  /** Stitches on the needle after the row, when it changed. */
  stitches: number | null
}

export function writtenRows(k: KnitChart): WrittenRow[] {
  const colored = usedColors(k).length > 1
  let count = castOn(k)
  return k.stitch.map((row, r) => {
    const { makes } = rowCounts(row)
    const changed = makes !== count
    count = makes
    return {
      row: r + 1,
      label: label(k, r),
      side: k.mode === 'round' ? null : isRightSide(k, r) ? 'RS' : 'WS',
      text: writeRow(k, r, colored),
      stitches: changed ? makes : null,
    }
  })
}

/** The written pattern: setting up, the colours, the key to the abbreviations used, then every row. */
export function writtenPattern(k: KnitChart, title = 'Knit Patterner chart'): string {
  const lines = [title, '']
  const n = castOn(k)
  lines.push(
    k.mode === 'round'
      ? `Cast on ${n} stitches. Join to work in the round, being careful not to twist. Every round is read from right to left.`
      : `Cast on ${n} stitches. Row 1 is a right-side (RS) row.`,
  )
  const colors = usedColors(k)
  if (colors.length > 1) {
    lines.push('', 'Colours:')
    for (const c of colors) lines.push(`  ${colorLetter(c)}: ${k.colors[c]}`)
  }
  const used = new Set<StitchId>(k.stitch.flat())
  lines.push('', 'Abbreviations:')
  for (const s of Object.values(STITCHES)) if (used.has(s.id)) lines.push(`  ${s.explain}`)
  if (k.mode === 'flat') lines.push('  RS: right side. WS: wrong side.')
  lines.push('  rep: repeat. st(s): stitch(es).', '')
  for (const w of writtenRows(k)) {
    const side = w.side ? ` (${w.side})` : ''
    const count = w.stitches === null ? '' : ` (${w.stitches} sts)`
    lines.push(`${w.label}${side}: ${w.text}.${count}`)
  }
  const last = k.stitch[k.stitch.length - 1]
  // Repeating rows keeps right and wrong sides in step only with an even number of rows.
  if (last && rowCounts(last).makes === n && k.stitch.length > 1 && (k.mode === 'round' || k.stitch.length % 2 === 0))
    lines.push('', `Repeat ${k.mode === 'round' ? 'rounds' : 'rows'} 1–${k.stitch.length} for the pattern.`)
  return lines.join('\n')
}
