export interface Draft {
  shafts: number
  treadles: number
  ends: number // warp threads (columns)
  picks: number // weft threads (rows)
  /** threading[end] = shaft index, or -1 if unthreaded */
  threading: number[]
  /** tieup[shaft][treadle] */
  tieup: boolean[][]
  /** treadling[pick][treadle] */
  treadling: boolean[][]
  warpColors: string[]
  weftColors: string[]
}

export const resize = <T>(arr: T[], len: number, fill: (i: number) => T): T[] =>
  Array.from({ length: len }, (_, i) => (i < arr.length ? arr[i] : fill(i)))

/** Straight-draw threading, twill tie-up (half the shafts lifted per treadle) and straight treadling. */
export function twillGrids(shafts: number, treadles: number, ends: number, picks: number) {
  const lifted = Math.max(1, Math.floor(shafts / 2))
  return {
    threading: Array.from({ length: ends }, (_, i) => i % shafts),
    tieup: Array.from({ length: shafts }, (_, s) =>
      Array.from({ length: treadles }, (_, t) => (s - (t % shafts) + shafts) % shafts < lifted),
    ),
    treadling: Array.from({ length: picks }, (_, p) => Array.from({ length: treadles }, (_, t) => t === p % treadles)),
  }
}

export function defaultDraft(): Draft {
  const shafts = 4
  const treadles = 4
  const ends = 32
  const picks = 32
  return {
    shafts,
    treadles,
    ends,
    picks,
    ...twillGrids(shafts, treadles, ends, picks),
    warpColors: Array(ends).fill('#8b0a0a'),
    weftColors: Array(picks).fill('#ffffff'),
  }
}

export function resizeDraft(d: Draft, dims: Partial<Pick<Draft, 'shafts' | 'treadles' | 'ends' | 'picks'>>): Draft {
  const shafts = dims.shafts ?? d.shafts
  const treadles = dims.treadles ?? d.treadles
  const ends = dims.ends ?? d.ends
  const picks = dims.picks ?? d.picks
  const lastWarp = d.warpColors[d.warpColors.length - 1] ?? '#8b0a0a'
  const lastWeft = d.weftColors[d.weftColors.length - 1] ?? '#ffffff'
  const colors = {
    warpColors: resize(d.warpColors, ends, () => lastWarp),
    weftColors: resize(d.weftColors, picks, () => lastWeft),
  }
  // A new shaft or treadle count regenerates the grids so the pattern uses all of them.
  if (shafts !== d.shafts || treadles !== d.treadles) {
    return {
      shafts,
      treadles,
      ends,
      picks,
      ...twillGrids(shafts, treadles, ends, picks),
      ...colors,
    }
  }
  return {
    shafts,
    treadles,
    ends,
    picks,
    threading: resize(d.threading, ends, () => -1).map((s) => (s < shafts ? s : -1)),
    tieup: resize(d.tieup, shafts, () => []).map((row) => resize(row, treadles, () => false)),
    treadling: resize(d.treadling, picks, () => []).map((row) => resize(row, treadles, () => false)),
    ...colors,
  }
}

/** drawdown[pick][end] = true when the warp thread is raised (warp shows on top) */
export function computeDrawdown(d: Draft): boolean[][] {
  return d.treadling.map((pressed) => {
    const raised = new Set<number>()
    pressed.forEach((on, t) => {
      if (!on) return
      for (let s = 0; s < d.shafts; s++) if (d.tieup[s][t]) raised.add(s)
    })
    return d.threading.map((s) => s >= 0 && raised.has(s))
  })
}

const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
const isInt = (v: unknown, min: number, max: number): v is number =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max

/** Validates untrusted data (e.g. an imported file) as a Draft, throwing a readable error if it isn't one. */
export function parseDraft(data: unknown): Draft {
  const d = data as Partial<Draft> | null
  if (!d || typeof d !== 'object') throw new Error('Not a weave pattern')
  const { shafts, treadles, ends, picks } = d
  if (!isInt(shafts, 1, 64) || !isInt(treadles, 1, 64) || !isInt(ends, 1, 1000) || !isInt(picks, 1, 1000))
    throw new Error('Pattern has missing or invalid dimensions')
  const boolGrid = (g: unknown, rows: number, cols: number): g is boolean[][] =>
    Array.isArray(g) &&
    g.length === rows &&
    g.every((r) => Array.isArray(r) && r.length === cols && r.every((v) => typeof v === 'boolean'))
  if (!Array.isArray(d.threading) || d.threading.length !== ends || !d.threading.every((s) => isInt(s, -1, shafts - 1)))
    throw new Error('Pattern has an invalid threading')
  if (!boolGrid(d.tieup, shafts, treadles)) throw new Error('Pattern has an invalid tie-up')
  if (!boolGrid(d.treadling, picks, treadles)) throw new Error('Pattern has an invalid treadling')
  if (!Array.isArray(d.warpColors) || d.warpColors.length !== ends || !d.warpColors.every(isHex))
    throw new Error('Pattern has invalid warp colours')
  if (!Array.isArray(d.weftColors) || d.weftColors.length !== picks || !d.weftColors.every(isHex))
    throw new Error('Pattern has invalid weft colours')
  return {
    shafts,
    treadles,
    ends,
    picks,
    threading: d.threading,
    tieup: d.tieup,
    treadling: d.treadling,
    warpColors: d.warpColors,
    weftColors: d.weftColors,
  }
}

const FILE_FORMAT = 'weave-patterner'

export function exportFile(name: string, draft: Draft): string {
  return JSON.stringify({ format: FILE_FORMAT, version: 1, name, draft })
}

/** Accepts either an exported file or a bare draft object. */
export function importFile(text: string): { name?: string; draft: Draft } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('File is not valid JSON')
  }
  const wrapped = data as { format?: unknown; name?: unknown; draft?: unknown }
  if (wrapped && wrapped.format === FILE_FORMAT) {
    return {
      name: typeof wrapped.name === 'string' ? wrapped.name : undefined,
      draft: parseDraft(wrapped.draft),
    }
  }
  return { draft: parseDraft(data) }
}
