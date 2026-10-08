import { blankChart, type KnitChart, MAX_COLORS, MAX_ROWS, MAX_STITCHES } from './chart'
import { makes, STITCH_IDS, STITCHES, type StitchId } from './stitches'

/** One square as worked: its stitch and colour. */
interface Worked {
  id: StitchId
  color: number
  /** A "k to end" (or "to last N sts") run, filled in once the rest of the row is known: the stitches to leave. */
  fill?: number
}

export interface ParsedPattern {
  chart: KnitChart | null
  rows: number
  /** Problems, each with the row it's in (0 for the pattern as a whole). */
  errors: { row: number; message: string }[]
}

const PALETTE = ['#f2ead8', '#2e5e8c', '#b03a2e', '#e0a800', '#4a7c59', '#6b4c9a', '#222222', '#ffffff']

/** Splits on commas (or semicolons) that aren't inside brackets. */
function topLevel(text: string, sep = /[,;]/): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of text) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if (depth === 0 && sep.test(ch)) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim()).filter(Boolean)
}

/** "twice", "3 times", "3 more times" (more: in addition to the first). */
function times(text: string): number | null {
  const t = text.trim().toLowerCase()
  if (t === 'once') return 1
  if (t === 'twice') return 2
  const m = /^(\d+)\s*(more\s+)?times?$/.exec(t)
  if (!m) return null
  return Number(m[1]) + (m[2] ? 1 : 0)
}

/** What a stitch's wording is on this side: the stitch it means. */
function lookup(side: 'rs' | 'ws') {
  const exact = new Map<string, StitchId>()
  for (const id of STITCH_IDS) {
    const s = STITCHES[id]
    const text = s[side].toLowerCase()
    if (text && !exact.has(text)) exact.set(text, id)
    // The other side's word works too, when it doesn't mean something else ("k1 tbl" on a wrong-side row).
  }
  return exact
}
const WORDS = { rs: lookup('rs'), ws: lookup('ws') }

/**
 * One instruction, such as "k3", "sl2 wyib", "yo", "k1 tbl", "2/2 RC" or "k2 B": the stitch, how many, and the
 * colour if lettered. Null if it isn't one.
 */
function stitch(text: string, side: 'rs' | 'ws'): { id: StitchId; count: number; color: number | null } | null {
  let t = text.trim().replace(/\s+/g, ' ')
  let color: number | null = null
  const lettered = /^(.*\S)\s+([A-H])$/.exec(t)
  if (lettered && !/(RC|LC|RT|LT|MB|PB)$/.test(t)) {
    color = lettered[2].charCodeAt(0) - 65
    t = lettered[1]
  }
  const words = WORDS[side]
  const lower = t.toLowerCase()
  // A cable crossing is one instruction but fills as many squares as it crosses.
  const span = (id: StitchId) => STITCHES[id].cable ?? 1
  const direct = words.get(lower)
  if (direct) return { id: direct, count: span(direct), color }
  // Counted: "k3", "sl2 wyib", "p10".
  const m = /^([a-z]+)(\d+)(.*)$/i.exec(t)
  if (m) {
    const id = words.get(`${m[1]}${m[3]}`.toLowerCase())
    if (id && STITCHES[id].counted) return { id, count: Number(m[2]) * span(id), color }
  }
  return null
}

/** Stitches used and squares made by a run of worked squares. */
const uses = (w: Worked[]) => w.reduce((n, x) => n + STITCHES[x.id].uses, 0)

/**
 * Expands a row's instructions into squares in working order. `available` is the stitches on the needle (needed
 * for "to end" and "to last N sts").
 */
function expand(
  text: string,
  side: 'rs' | 'ws',
  available: number | null,
  error: (m: string) => void,
): Worked[] | null {
  const out: Worked[] = []
  // A star repeat: "before, *unit; rep from * to end, after" (or "to last N sts" or "N more times").
  const star = /^(.*?)\*(.+?);\s*rep(?:eat)? from \*\s*(.*)$/i.exec(text)
  if (star) {
    const before = star[1] ? expand(star[1].replace(/,\s*$/, ''), side, null, error) : []
    const unit = expand(star[2], side, null, error)
    if (!before || !unit) return null
    let rest = star[3].trim()
    let count: number | null = null
    let leave = 0
    const toEnd = /^to end\b,?\s*(.*)$/i.exec(rest)
    const toLast = /^to last (?:(\d+) sts?|st)\b,?\s*(.*)$/i.exec(rest)
    const n = /^(\d+ more times|\d+ times|twice|once)\b,?\s*(.*)$/i.exec(rest)
    if (toEnd) rest = toEnd[1]
    else if (toLast) {
      leave = toLast[1] ? Number(toLast[1]) : 1
      rest = toLast[2]
    } else if (n) {
      count = times(n[1])
      rest = n[2]
    }
    const after = rest ? expand(rest, side, null, error) : []
    if (!after) return null
    if (count === null) {
      if (available === null) {
        error('needs to know the stitches on the needle (add the cast-on, e.g. "Cast on 24 stitches")')
        return null
      }
      const room = available - uses(before) - leave - (toEnd && after.length ? uses(after) : 0)
      const u = uses(unit)
      if (u <= 0 || room < 0 || room % u) {
        error(`the repeat (${u} sts) doesn't fit the ${available} stitches on the needle`)
        return null
      }
      count = room / u
    }
    out.push(...before)
    for (let i = 0; i < count; i++) out.push(...unit)
    out.push(...after)
    return out
  }
  for (const part of topLevel(text)) {
    // "(yo, k1) 3 times" or "(k1 tbl) twice".
    const group = /^\((.+)\)\s*(.*)$/.exec(part)
    if (group) {
      const n = times(group[2] || 'once')
      const inner = expand(group[1], side, null, error)
      if (n === null || !inner) {
        if (n === null) error(`didn't understand "${part}"`)
        return null
      }
      for (let i = 0; i < n; i++) out.push(...inner)
      continue
    }
    // "k to end", "p to last 2 sts".
    const fill = /^(\S+(?: \S+)?) to (end|last (\d+) sts?|last st)$/i.exec(part)
    if (fill) {
      const s = stitch(fill[1], side)
      if (!s || available === null) {
        error(available === null ? `"${part}" needs the cast-on` : `didn't understand "${part}"`)
        return null
      }
      const leave = fill[3] ? Number(fill[3]) : /last st$/i.test(fill[2]) ? 1 : 0
      // What's left once the rest of the row is worked (worked out after, so count the rest first).
      out.push({ id: s.id, color: s.color ?? 0, fill: leave })
      continue
    }
    // "yo twice", "k2tog 3 times".
    const repeated = /^(.+?)\s+(twice|once|\d+ times)$/i.exec(part)
    const base = repeated ? stitch(repeated[1], side) : null
    if (repeated && base) {
      const n = times(repeated[2]) ?? 1
      for (let i = 0; i < n * base.count; i++) out.push({ id: base.id, color: base.color ?? 0 })
      continue
    }
    const s = stitch(part, side)
    if (!s) {
      error(`didn't understand "${part}"`)
      return null
    }
    for (let i = 0; i < s.count; i++) out.push({ id: s.id, color: s.color ?? 0 })
  }
  // Fill in "to end" squares (marked with a negative colour) now the rest of the row is known.
  const filler = out.findIndex((w) => w.fill !== undefined)
  if (filler >= 0) {
    if (available === null) return null
    const { id, color, fill = 0 } = out[filler]
    const rest = uses(out.filter((_, i) => i !== filler))
    const n = available - rest - fill
    if (n < 0) {
      error(`there aren't enough stitches for "to end"`)
      return null
    }
    out.splice(filler, 1, ...Array.from({ length: n }, () => ({ id, color })))
  }
  return out
}

/**
 * Reads a written pattern into a chart: "Cast on 24 stitches", then rows such as "Row 1 (RS): *k2, p2; rep from *
 * to end." or "Rnd 3: k1, yo, k2tog". Rows are worked as written: right-side rows (and every round) from the right
 * of the chart, wrong-side rows from the left with each stitch worked as its opposite. Colour letters (k2 B) give
 * the colours. Rows that make fewer stitches than the widest are filled out with "no stitch" squares at the end.
 */
export function parseWritten(text: string): ParsedPattern {
  const errors: { row: number; message: string }[] = []
  const lines = text.split(/\r?\n/)
  const rowLine = /^(rows?|rnds?|rounds?|r)\s*(\d+)(?:\s*\((rs|ws)\))?\s*[:.-]\s*(.+)$/i
  const unindented = lines.filter((l) => rowLine.test(l.trim()) && !/^\s/.test(l))
  const rowLines = (unindented.length ? unindented : lines.filter((l) => rowLine.test(l.trim()))).map((l) => l.trim())
  if (!rowLines.length)
    return { chart: null, rows: 0, errors: [{ row: 0, message: 'No rows found: write them as "Row 1: k2, p2…"' }] }
  const round = rowLines.some((l) => /^(rnd|round)/i.test(l))
  const castLine = lines.find((l) => /cast on/i.test(l)) ?? ''
  const castMatch = /\((\d+) for one repeat\)/i.exec(castLine) ?? /cast on (\d+)/i.exec(castLine)
  let available: number | null = castMatch ? Number(castMatch[1]) : null

  const rows: Worked[][] = []
  for (const line of rowLines) {
    const m = rowLine.exec(line)
    if (!m) continue
    const n = Number(m[2])
    if (n !== rows.length + 1) {
      errors.push({ row: n, message: `Row ${n} is out of order (expected row ${rows.length + 1}).` })
      break
    }
    // Wrong-side rows: marked WS, or every even row when flat.
    const side: 'rs' | 'ws' = round ? 'rs' : m[3] ? (m[3].toLowerCase() as 'rs' | 'ws') : n % 2 ? 'rs' : 'ws'
    let body = m[4].trim().replace(/\.\s*$/, '')
    body = body.replace(/\s*\(\d+ sts?\)\s*\.?$/i, '').replace(/\.\s*$/, '')
    // A whole row of one stitch: "Row 2: purl." or "knit across".
    const whole = /^(knit|purl)(?: across| all sts| to end)?$/i.exec(body)
    if (whole) body = `${whole[1].toLowerCase() === 'knit' ? 'k' : 'p'} to end`
    let unworked = 0
    const short = /\s*\((\d+) sts? left unworked\)$/i.exec(body)
    if (short) {
      unworked = Number(short[1])
      body = body.slice(0, short.index)
    }
    let failed = false
    const worked = expand(body, side, available === null ? null : available - unworked, (message) => {
      if (!failed) errors.push({ row: n, message: `Row ${n}: ${message}.` })
      failed = true
    })
    if (!worked) break
    const row = [...worked, ...Array.from({ length: unworked }, () => ({ id: 'rest' as StitchId, color: 0 }))]
    if (available === null) available = uses(row)
    else if (uses(row) !== available) {
      errors.push({
        row: n,
        message: `Row ${n} works ${uses(row)} stitches, but there are ${available} on the needle.`,
      })
    }
    available = row.reduce((s, w) => s + makes(w.id), 0)
    rows.push(row)
    if (rows.length >= MAX_ROWS) break
  }
  if (!rows.length) return { chart: null, rows: 0, errors }
  const width = Math.max(...rows.map((r) => r.length))
  if (width > MAX_STITCHES) {
    errors.push({ row: 0, message: `That's ${width} stitches wide: charts can be up to ${MAX_STITCHES}.` })
    return { chart: null, rows: rows.length, errors }
  }
  const colorsUsed = Math.min(MAX_COLORS, Math.max(2, ...rows.flat().map((w) => w.color + 1)))
  const chart = blankChart(width, rows.length, PALETTE.slice(0, colorsUsed))
  chart.mode = round ? 'round' : 'flat'
  rows.forEach((row, r) => {
    // Right-side rows and rounds are worked from the right of the chart, wrong-side rows from the left.
    const fromRight = round || r % 2 === 0
    for (let i = 0; i < width; i++) {
      const c = fromRight ? width - 1 - i : i
      const w = row[i]
      chart.stitch[r][c] = w ? w.id : 'none'
      chart.color[r][c] = w ? Math.min(colorsUsed - 1, w.color) : 0
    }
  })
  return { chart, rows: rows.length, errors }
}
