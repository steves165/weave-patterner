import { type Draft, parseDraft } from './weave'

/**
 * WIF (Weaving Information File) 1.1 export — the standard format read by weaving software and
 * computer-dobby loom drivers. Thread, pick, shaft and treadle numbers are 1-based; warp end 1 is the
 * leftmost end and pick 1 is the top pick as drawn in the app. Rising shed: tied/lifted shafts go up.
 */
export function toWif(name: string, draft: Draft, { liftplan = false } = {}): string {
  const { shafts, treadles, ends, picks } = draft

  // One colour table entry per distinct colour used.
  const palette = [...new Set([...draft.warpColors, ...draft.weftColors].map((c) => c.toLowerCase()))]
  const colorIndex = (c: string) => palette.indexOf(c.toLowerCase()) + 1
  const rgb = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)).join(',')
  const mostCommon = (cs: string[]) => {
    const counts = new Map<string, number>()
    for (const c of cs) counts.set(c.toLowerCase(), (counts.get(c.toLowerCase()) ?? 0) + 1)
    return [...counts].sort((a, b) => b[1] - a[1])[0][0]
  }

  // Shafts lifted on each pick, combining every pressed treadle's tie-up.
  const lifts = draft.treadling.map((pressed) =>
    Array.from({ length: shafts }, (_, s) => s).filter((s) => pressed.some((on, t) => on && draft.tieup[s][t])),
  )

  const section = (title: string, entries: [string | number, string | number][]) =>
    [`[${title}]`, ...entries.map(([k, v]) => `${k}=${v}`), ''].join('\r\n')
  const list = (ns: number[]) => ns.map((n) => n + 1).join(',')
  const nonEmpty = <T>(rows: [number, T[]][]) => rows.filter(([, v]) => v.length > 0)

  const threading = nonEmpty(draft.threading.map((s, e) => [e + 1, s >= 0 ? [s] : []]))
  const tieup = nonEmpty(
    Array.from({ length: treadles }, (_, t) => [t + 1, draft.tieup.flatMap((row, s) => (row[t] ? [s] : []))]),
  )
  const treadling = nonEmpty(draft.treadling.map((row, p) => [p + 1, row.flatMap((on, t) => (on ? [t] : []))]))
  const liftRows = nonEmpty(lifts.map((ss, p) => [p + 1, ss]))

  const parts = [
    section('WIF', [
      ['Version', '1.1'],
      ['Date', 'April 20, 1997'],
      ['Developers', 'wif@mhsoft.com'],
      ['Source Program', 'Weave Patterner'],
      ['Source Version', '1.0'],
    ]),
    section('CONTENTS', [
      ['COLOR PALETTE', 'true'],
      ['COLOR TABLE', 'true'],
      ['TEXT', 'true'],
      ['WEAVING', 'true'],
      ['WARP', 'true'],
      ['WEFT', 'true'],
      ['THREADING', 'true'],
      ...(liftplan
        ? ([['LIFTPLAN', 'true']] as [string, string][])
        : ([
            ['TIEUP', 'true'],
            ['TREADLING', 'true'],
          ] as [string, string][])),
      ['WARP COLORS', 'true'],
      ['WEFT COLORS', 'true'],
    ]),
    section('TEXT', [['Title', name.replace(/[\r\n]+/g, ' ')]]),
    section('WEAVING', [
      ['Shafts', shafts],
      // Lift plans have no tie-up; report a treadle per shaft so readers that dislike 0 treadles cope.
      ['Treadles', liftplan ? shafts : treadles],
      ['Rising Shed', 'true'],
    ]),
    section('WARP', [
      ['Threads', ends],
      ['Color', colorIndex(mostCommon(draft.warpColors))],
    ]),
    section('WEFT', [
      ['Threads', picks],
      ['Color', colorIndex(mostCommon(draft.weftColors))],
    ]),
    section('COLOR PALETTE', [
      ['Entries', palette.length],
      ['Form', 'RGB'],
      ['Range', '0,255'],
    ]),
    section(
      'COLOR TABLE',
      palette.map((c, i) => [i + 1, rgb(c)]),
    ),
    section(
      'THREADING',
      threading.map(([e, ss]) => [e, list(ss)]),
    ),
    ...(liftplan
      ? [
          section(
            'LIFTPLAN',
            liftRows.map(([p, ss]) => [p, list(ss)]),
          ),
        ]
      : [
          section(
            'TIEUP',
            tieup.map(([t, ss]) => [t, list(ss)]),
          ),
          section(
            'TREADLING',
            treadling.map(([p, ts]) => [p, list(ts)]),
          ),
        ]),
    section(
      'WARP COLORS',
      draft.warpColors.map((c, e) => [e + 1, colorIndex(c)]),
    ),
    section(
      'WEFT COLORS',
      draft.weftColors.map((c, p) => [p + 1, colorIndex(c)]),
    ),
  ]
  return parts.join('\r\n')
}

/** Largest pattern import will keep; bigger drafts are truncated (the editor gets slow beyond this). */
const MAX_THREADS = 1000

export interface WifImport {
  name?: string
  draft: Draft
  /** Things that couldn't be represented exactly, worth telling the user about. */
  warnings: string[]
}

/** Reads a WIF file (any version 1.x writer): threading plus either tie-up/treadling or a lift plan, and colours. */
export function fromWif(text: string): WifImport {
  // Sections and keys are case-insensitive; ';' starts a comment line.
  const sections = new Map<string, Map<string, string>>()
  let current: Map<string, string> | null = null
  for (const raw of text.split(/\r\n|\r|\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith(';')) continue
    const header = /^\[(.+)\]$/.exec(line)
    if (header) {
      current = new Map()
      sections.set(header[1].trim().toUpperCase(), current)
    } else if (current && line.includes('=')) {
      const i = line.indexOf('=')
      current.set(line.slice(0, i).trim().toUpperCase(), line.slice(i + 1).trim())
    }
  }
  if (!sections.has('WIF')) throw new Error('Not a WIF file (no [WIF] section)')

  const warnings: string[] = []
  const sec = (name: string) => sections.get(name) ?? new Map<string, string>()
  const int = (v: string | undefined) => (v !== undefined && /^\d+$/.test(v) ? Number(v) : undefined)
  const numList = (v: string | undefined) =>
    (v ?? '')
      .split(',')
      .map((n) => int(n.trim()))
      .filter((n): n is number => n !== undefined && n > 0)
  /** Entries of a numbered section (e.g. THREADING: thread -> shafts), 1-based keys. */
  const entries = (name: string) =>
    [...sec(name)].flatMap(([k, v]): [number, string][] => {
      const n = int(k)
      return n ? [[n, v]] : []
    })
  const maxKey = (name: string) => Math.max(0, ...entries(name).map(([k]) => k))

  const weaving = sec('WEAVING')
  const risingShed = !/^(false|no|0)$/i.test(weaving.get('RISING SHED') ?? 'true')
  const liftplanRows = entries('LIFTPLAN')
  const useLiftplan = liftplanRows.length > 0 && entries('TREADLING').length === 0

  let shafts = int(weaving.get('SHAFTS')) ?? 0
  shafts = Math.max(shafts, ...entries('THREADING').flatMap(([, v]) => numList(v)))
  if (shafts < 1) throw new Error('WIF file has no shafts')

  let ends = int(sec('WARP').get('THREADS')) ?? maxKey('THREADING')
  let picks = int(sec('WEFT').get('THREADS')) ?? Math.max(maxKey('TREADLING'), maxKey('LIFTPLAN'))
  if (ends < 1 || picks < 1) throw new Error('WIF file has no warp or weft threads')
  if (ends > MAX_THREADS || picks > MAX_THREADS) {
    warnings.push(`Trimmed from ${ends} × ${picks} to at most ${MAX_THREADS} ends and picks`)
    ends = Math.min(ends, MAX_THREADS)
    picks = Math.min(picks, MAX_THREADS)
  }

  // Threading: the app holds one shaft per end; keep the first if a file lists several.
  const threading: number[] = Array(ends).fill(-1)
  let multiThreaded = 0
  for (const [e, v] of entries('THREADING')) {
    const ss = numList(v)
    if (e > ends || ss.length === 0) continue
    if (ss.length > 1) multiThreaded++
    threading[e - 1] = ss[0] - 1
  }
  if (multiThreaded)
    warnings.push(
      `${multiThreaded} ${multiThreaded === 1 ? 'end was' : 'ends were'} threaded on several shafts; kept the first shaft`,
    )

  // A sinking-shed file marks the shafts that go down; the app shows lifted shafts, so invert.
  const lifted = (marked: number[]) =>
    risingShed ? marked : Array.from({ length: shafts }, (_, s) => s + 1).filter((s) => !marked.includes(s))
  if (!risingShed) warnings.push('Converted from a sinking-shed draft to rising shed')

  let treadles: number
  let tieup: boolean[][]
  const treadling: boolean[][] = []
  if (useLiftplan) {
    // Represent a lift plan as one treadle per shaft with a straight (direct) tie-up.
    treadles = shafts
    tieup = Array.from({ length: shafts }, (_, s) => Array.from({ length: treadles }, (_, t) => s === t))
    for (let p = 0; p < picks; p++) treadling.push(Array(treadles).fill(false))
    for (const [p, v] of liftplanRows) {
      if (p > picks) continue
      for (const s of lifted(numList(v))) if (s <= shafts) treadling[p - 1][s - 1] = true
    }
    warnings.push(`Lift plan shown as ${shafts} treadles with a straight tie-up`)
  } else {
    treadles = Math.max(
      int(weaving.get('TREADLES')) ?? 0,
      ...entries('TIEUP').map(([t]) => t),
      ...entries('TREADLING').flatMap(([, v]) => numList(v)),
    )
    if (treadles < 1) throw new Error('WIF file has neither a treadling nor a lift plan')
    tieup = Array.from({ length: shafts }, () => Array(treadles).fill(false))
    for (const [t, v] of entries('TIEUP')) {
      if (t > treadles) continue
      for (const s of lifted(numList(v))) if (s <= shafts) tieup[s - 1][t - 1] = true
    }
    for (let p = 0; p < picks; p++) treadling.push(Array(treadles).fill(false))
    for (const [p, v] of entries('TREADLING')) {
      if (p > picks) continue
      for (const t of numList(v)) if (t <= treadles) treadling[p - 1][t - 1] = true
    }
  }

  // Colours: palette entries are scaled from the file's declared range (often 0-255 or 0-999) to hex.
  const [lo, hi] = (sec('COLOR PALETTE').get('RANGE') ?? '0,255').split(',').map(Number)
  const span = hi > lo ? hi - lo : 255
  const toHex = (rgb: string) => {
    const cs = rgb.split(',').map((n) => Number(n.trim()))
    if (cs.length < 3 || cs.some((n) => !Number.isFinite(n))) return undefined
    return (
      '#' +
      cs
        .slice(0, 3)
        .map((n) =>
          Math.round((Math.min(Math.max(n - (lo || 0), 0), span) / span) * 255)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
    )
  }
  const table = new Map(
    entries('COLOR TABLE').flatMap(([i, v]): [number, string][] => {
      const hex = toHex(v)
      return hex ? [[i, hex]] : []
    }),
  )
  // Colour references are palette indexes; take the first number in case a writer adds extra fields.
  const colorRef = (v: string | undefined) => (v ? table.get(numList(v)[0]) : undefined)
  const warpDefault = colorRef(sec('WARP').get('COLOR')) ?? '#8b0a0a'
  const weftDefault = colorRef(sec('WEFT').get('COLOR')) ?? '#ffffff'
  const warpColors: string[] = Array(ends).fill(warpDefault)
  const weftColors: string[] = Array(picks).fill(weftDefault)
  for (const [e, v] of entries('WARP COLORS')) if (e <= ends) warpColors[e - 1] = colorRef(v) ?? warpDefault
  for (const [p, v] of entries('WEFT COLORS')) if (p <= picks) weftColors[p - 1] = colorRef(v) ?? weftDefault

  const name = sec('TEXT').get('TITLE') || undefined
  const draft = parseDraft({
    shafts,
    treadles,
    ends,
    picks,
    threading,
    tieup,
    treadling,
    warpColors,
    weftColors,
  })
  return { name, draft, warnings }
}
