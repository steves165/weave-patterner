import { liftsPerPick, toTreadling } from './liftplan'
import type { Draft } from './weave'

/**
 * A named block of ends: a stretch of the threading (with its warp colours), marked above the columns as A, B, C …
 * from end 1. Blocks don't overlap. `from` and `to` are 0-based end indices, both included.
 */
export interface EndBlock {
  from: number
  to: number
  name: string
  /** The picks that weave this block (0-based, both included), when they've been set. */
  picks?: { from: number; to: number }
  /**
   * A preset woven in this block, all the way down: the shafts it lifts on each of its picks (from 0), and the
   * block's first shaft. The block has those shafts to itself.
   */
  weave?: BlockWeave
}

export interface BlockWeave {
  name: string
  /** The block's first shaft (0-based): the preset's shaft 1 is this one. */
  offset: number
  /** For each pick of the preset's repeat, the shafts it lifts, counted from the block's first shaft. */
  lifts: number[][]
}

/**
 * The weft of a saved block: its picks' treadling, on treadles of its own (each the shafts it lifts), and their
 * colours. Put into a pattern, each treadle becomes one there with the same tie-up, or a new one.
 */
export interface SavedWeft {
  /** For each of the block's treadles, the shafts it lifts (0-based). */
  treadles: number[][]
  /** For each pick, the block's treadles pressed. */
  treadling: number[][]
  weftColors: string[]
}

/** A block kept in the block store, to use again in any pattern. Shafts are 0-based, -1 unthreaded. */
export interface SavedBlock {
  name: string
  threading: number[]
  warpColors: string[]
  /** Its picks too, when they were saved with it. */
  weft?: SavedWeft
  updatedAt: number
}

export const MAX_SAVED_BLOCKS = 200
export const MAX_ENDS = 1000

/** A, B, … Z, then AA, AB, … */
export function blockLetter(i: number): string {
  return i < 26 ? String.fromCharCode(65 + i) : blockLetter(Math.floor(i / 26) - 1) + blockLetter(i % 26)
}

/** "A (1–4)": a block's letter and ends, counted from 1. */
export function blockTitle(blocks: EndBlock[], i: number): string {
  const b = blocks[i]
  return `${blockLetter(i)} (${b.from === b.to ? b.from + 1 : `${b.from + 1}–${b.to + 1}`})`
}

/** A block's picks kept inside `picks`, or none. */
function cleanPicks(r: EndBlock['picks'], picks: number): EndBlock['picks'] {
  if (!r || !Number.isInteger(r.from) || !Number.isInteger(r.to)) return undefined
  const to = Math.min(r.to, picks - 1)
  return r.from >= 0 && r.from <= to ? { from: r.from, to } : undefined
}

/**
 * Blocks inside `ends` (and their picks inside `picks`), in order along the warp, without overlaps (a later block
 * gives way to an earlier one).
 */
export function cleanBlocks(blocks: EndBlock[], ends: number, picks = Number.POSITIVE_INFINITY): EndBlock[] {
  const sorted = blocks
    .map((b) => {
      const { picks: r, ...rest } = b
      const kept = cleanPicks(r, picks)
      return { ...rest, to: Math.min(b.to, ends - 1), ...(kept ? { picks: kept } : {}) }
    })
    .filter((b) => Number.isInteger(b.from) && Number.isInteger(b.to) && b.from >= 0 && b.from <= b.to)
    .sort((a, b) => a.from - b.from)
  const out: EndBlock[] = []
  for (const b of sorted) if (!out.length || b.from > out[out.length - 1].to) out.push(b)
  return out
}

const withBlocks = (d: Draft, blocks: EndBlock[]): Draft => ({ ...d, blocks: cleanBlocks(blocks, d.ends, d.picks) })

/** Marks ends `from` to `to` (either order) as a block. Blocks it overlaps are cut back to make room. */
export function addBlock(d: Draft, from: number, to: number, name = ''): Draft {
  const [a, b] = [Math.max(0, Math.min(from, to)), Math.min(d.ends - 1, Math.max(from, to))]
  const kept = (d.blocks ?? []).flatMap((x) =>
    x.to < a || x.from > b
      ? [x]
      : [
          { ...x, to: a - 1 },
          { ...x, from: b + 1 },
        ].filter((y) => y.from <= y.to),
  )
  return withBlocks(d, [...kept, { from: a, to: b, name: name.trim() }])
}

export function renameBlock(d: Draft, i: number, name: string): Draft {
  return withBlocks(
    d,
    (d.blocks ?? []).map((b, j) => (j === i ? { ...b, name } : b)),
  )
}

/** Changes which ends block i covers. */
export function moveBlock(d: Draft, i: number, from: number, to: number): Draft {
  const b = d.blocks?.[i]
  if (!b) return d
  const moved = addBlock({ ...d, blocks: d.blocks?.filter((_, j) => j !== i) }, from, to, b.name)
  return b.picks ? setBlockPicks(moved, blockAt(moved, Math.min(from, to)), b.picks.from, b.picks.to) : moved
}

/** The index of the block starting at end `from`. */
const blockAt = (d: Draft, from: number) => (d.blocks ?? []).findIndex((b) => b.from === from)

/** Sets which picks weave block i (either order), or clears them with `from` null. */
export function setBlockPicks(d: Draft, i: number, from: number | null, to = from): Draft {
  const blocks = (d.blocks ?? []).map((b, j) => {
    if (j !== i) return b
    const { picks, ...rest } = b
    if (from === null || to === null) return rest
    return { ...rest, picks: { from: Math.min(from, to), to: Math.max(from, to) } }
  })
  return withBlocks(d, blocks)
}

/**
 * The picks that weave block i: those set for it, or else the same numbers as its ends (as when a block is woven as
 * drawn in), as far as the treadling goes. Null when there are none.
 */
export function blockPicks(d: Draft, i: number): { from: number; to: number } | null {
  const b = d.blocks?.[i]
  if (!b) return null
  if (b.picks) return b.picks
  if (b.from >= d.picks) return null
  return { from: b.from, to: Math.min(b.to, d.picks - 1) }
}

/** Takes the block's label away; its ends stay as they are. */
export function removeBlock(d: Draft, i: number): Draft {
  return withBlocks(
    d,
    (d.blocks ?? []).filter((_, j) => j !== i),
  )
}

/** The weft of picks `from` to `to`: their treadling on treadles of their own, and their colours. */
export function weftOf(d: Draft, from: number, to: number): SavedWeft {
  const used: number[] = []
  const rows = d.treadling.slice(from, to + 1)
  for (const row of rows) for (const [t, on] of row.entries()) if (on && !used.includes(t)) used.push(t)
  used.sort((a, b) => a - b)
  return {
    treadles: used.map((t) => d.tieup.flatMap((row, s) => (row[t] ? [s] : []))),
    treadling: rows.map((row) => used.flatMap((t, k) => (row[t] ? [k] : []))),
    weftColors: d.weftColors.slice(from, to + 1),
  }
}

/** The threading and warp colours of block i, and its picks, ready for the block store. */
export function blockContents(d: Draft, i: number, name: string): SavedBlock {
  const b = (d.blocks ?? [])[i]
  const picks = blockPicks(d, i)
  return {
    name,
    threading: d.threading.slice(b.from, b.to + 1),
    warpColors: d.warpColors.slice(b.from, b.to + 1),
    ...(picks ? { weft: weftOf(d, picks.from, picks.to) } : {}),
    updatedAt: Date.now(),
  }
}

/** Shafts a saved block's weft lifts, at most. */
const weftShafts = (w: SavedWeft) => Math.max(0, ...w.treadles.flat()) + 1

/** Shafts a saved block needs. */
export const shaftsUsed = (s: SavedBlock) => Math.max(Math.max(0, ...s.threading) + 1, s.weft ? weftShafts(s.weft) : 0)

/** Whether a draft is a lift plan: no tie-up, each treadle column lifting the shaft of the same number. */
const isLiftplan = (d: Draft) =>
  d.shafts === d.treadles && d.tieup.every((row, s) => row.every((on, t) => on === (s === t)))

/** Adds shafts (with nothing tied up or lifted on them) so that a block fits. */
function withShafts(d: Draft, shafts: number): Draft {
  if (shafts <= d.shafts) return d
  const extra = shafts - d.shafts
  // Without a tie-up (a lift plan), each treadle column is a shaft, so they grow together.
  if (isLiftplan(d))
    return {
      ...d,
      shafts,
      treadles: shafts,
      tieup: Array.from({ length: shafts }, (_, s) => Array.from({ length: shafts }, (_, t) => s === t)),
      treadling: d.treadling.map((row) => [...row, ...Array(extra).fill(false)]),
    }
  return {
    ...d,
    shafts,
    tieup: [...d.tieup, ...Array.from({ length: extra }, () => Array(d.treadles).fill(false))],
  }
}

export const MAX_PICKS = 1000
const MAX_TREADLES = 128
const MAX_SHAFTS = 128

/**
 * The pattern's treadle for each of a weft's treadles: one already tied to exactly the same shafts, or a new one added
 * at the right. In a lift plan, picks lift shafts directly, so there's nothing to add.
 */
function treadlesFor(d: Draft, w: SavedWeft): { draft: Draft; map: number[] | null } {
  if (isLiftplan(d)) return { draft: d, map: null }
  let draft = d
  const map = w.treadles.map((shafts) => {
    const want = (s: number) => shafts.includes(s)
    const found = Array.from({ length: draft.treadles }, (_, t) => t).find((t) =>
      draft.tieup.every((row, s) => row[t] === want(s)),
    )
    if (found !== undefined) return found
    if (draft.treadles >= MAX_TREADLES) throw new Error(`That needs more than ${MAX_TREADLES} treadles`)
    draft = {
      ...draft,
      treadles: draft.treadles + 1,
      tieup: draft.tieup.map((row, s) => [...row, want(s)]),
      treadling: draft.treadling.map((row) => [...row, false]),
    }
    return draft.treadles - 1
  })
  return { draft, map }
}

/** A weft's picks as treadling rows for the draft (after treadlesFor). */
function rowsFor(d: Draft, w: SavedWeft, map: number[] | null): boolean[][] {
  return w.treadling.map((pressed) => {
    const row = Array(d.treadles).fill(false)
    for (const k of pressed) {
      if (map) row[map[k]] = true
      // A lift plan: press the shafts the treadle lifted.
      else for (const s of w.treadles[k]) row[s] = true
    }
    return row
  })
}

/**
 * Splices `count` picks at `at` for a weft (its treadles found or added in the tie-up), shifting the blocks' picks
 * after them along. Returns the draft and where the new picks are.
 */
export function splicePicks(d: Draft, at: number, count: number, w: SavedWeft): Draft {
  const picks = d.picks - count + w.treadling.length
  if (picks > MAX_PICKS) throw new Error(`That would make ${picks} picks: patterns can have up to ${MAX_PICKS}`)
  const { draft, map } = treadlesFor(withShafts(d, weftShafts(w)), w)
  const shift = w.treadling.length - count
  return {
    ...draft,
    picks,
    treadling: [...draft.treadling.slice(0, at), ...rowsFor(draft, w, map), ...draft.treadling.slice(at + count)],
    weftColors: [...draft.weftColors.slice(0, at), ...w.weftColors, ...draft.weftColors.slice(at + count)],
    blocks: (draft.blocks ?? []).map((b) =>
      b.picks && b.picks.from >= at + count
        ? { ...b, picks: { from: b.picks.from + shift, to: b.picks.to + shift } }
        : b,
    ),
  }
}

/**
 * Splices `count` ends at `at` for `saved`'s ends, shifting the blocks after them along and keeping the new ends as a
 * block named after the saved one. Shafts are added if the block needs more.
 */
function splice(
  d: Draft,
  at: number,
  count: number,
  saved: SavedBlock,
  replacing?: number,
  weft?: { at: number; count: number },
): Draft {
  const ends = d.ends - count + saved.threading.length
  if (ends > MAX_ENDS) throw new Error(`That would make ${ends} ends: patterns can have up to ${MAX_ENDS}`)
  const grown = withShafts(d, shaftsUsed(saved))
  const shift = saved.threading.length - count
  const blocks = (d.blocks ?? [])
    .filter((_, j) => j !== replacing)
    .map((b) => (b.from >= at + count ? { ...b, from: b.from + shift, to: b.to + shift } : b))
  const next: Draft = {
    ...grown,
    ends,
    threading: [...d.threading.slice(0, at), ...saved.threading, ...d.threading.slice(at + count)],
    warpColors: [...d.warpColors.slice(0, at), ...saved.warpColors, ...d.warpColors.slice(at + count)],
    blocks,
  }
  const placed = addBlock(next, at, at + saved.threading.length - 1, saved.name)
  if (!saved.weft || !weft) return placed
  // The block's picks too, marked as its picks.
  const woven = splicePicks(placed, weft.at, weft.count, saved.weft)
  return setBlockPicks(woven, blockAt(woven, at), weft.at, weft.at + saved.weft.treadling.length - 1)
}

/**
 * Puts a saved block in before end `at` (0-based; `ends` adds it at the end), and its picks (if it has them) before
 * pick `pickAt` (the end of the treadling unless given).
 */
export function insertBlock(d: Draft, saved: SavedBlock, at: number, pickAt = d.picks): Draft {
  return splice(d, Math.max(0, Math.min(d.ends, at)), 0, saved, undefined, {
    at: Math.max(0, Math.min(d.picks, pickAt)),
    count: 0,
  })
}

/** Where picks go in after block i: after its picks, or else after the pick numbered like its last end. */
export function picksAfter(d: Draft, i: number): number {
  const r = blockPicks(d, i)
  return r ? r.to + 1 : d.picks
}

/**
 * Swaps the ends of block i for a saved block, which may be longer or shorter; and its picks for the saved block's,
 * when both have them.
 */
export function replaceBlock(d: Draft, i: number, saved: SavedBlock): Draft {
  const b = d.blocks?.[i]
  if (!b) return d
  const r = blockPicks(d, i)
  return splice(d, b.from, b.to - b.from + 1, saved, i, r ? { at: r.from, count: r.to - r.from + 1 } : undefined)
}

/** The next unused "Saved block N" name. */
export function nextBlockName(taken: string[]): string {
  let n = 1
  while (taken.includes(`Saved block ${n}`)) n++
  return `Saved block ${n}`
}

const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

/** Reads blocks from untrusted data, keeping the valid ones. */
export function parseBlocks(data: unknown, ends: number, picks = Number.POSITIVE_INFINITY): EndBlock[] {
  if (!Array.isArray(data)) return []
  return cleanBlocks(
    data
      .filter((b) => b && typeof b === 'object')
      .map((b) => ({
        from: b.from,
        to: b.to,
        name: typeof b.name === 'string' ? b.name.slice(0, 80) : '',
        ...(b.picks && typeof b.picks === 'object' ? { picks: { from: b.picks.from, to: b.picks.to } } : {}),
        ...(parseWeave(b.weave) ? { weave: parseWeave(b.weave) } : {}),
      })),
    ends,
    picks,
  )
}

/** A block's preset weave from untrusted data, if it's valid. */
function parseWeave(w: unknown): BlockWeave | undefined {
  if (!w || typeof w !== 'object') return undefined
  const { name, offset, lifts } = w as Record<string, unknown>
  if (!Number.isInteger(offset) || (offset as number) < 0 || (offset as number) >= MAX_SHAFTS) return undefined
  if (!Array.isArray(lifts) || !lifts.length || lifts.length > MAX_PICKS) return undefined
  const ok = lifts.every(
    (row) =>
      Array.isArray(row) && row.every((s) => Number.isInteger(s) && s >= 0 && s + (offset as number) < MAX_SHAFTS),
  )
  return ok ? { name: typeof name === 'string' ? name.slice(0, 80) : '', offset: offset as number, lifts } : undefined
}

/** A saved block's weft from untrusted data, if it's valid. */
function parseWeft(w: unknown): SavedWeft | undefined {
  if (!w || typeof w !== 'object') return undefined
  const { treadles, treadling, weftColors } = w as Record<string, unknown>
  const ints = (xs: unknown, max: number) =>
    Array.isArray(xs) && xs.every((v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) < max)
  if (!Array.isArray(treadles) || treadles.length > MAX_TREADLES || !treadles.every((t) => ints(t, 128)))
    return undefined
  if (!Array.isArray(treadling) || !treadling.length || treadling.length > MAX_PICKS) return undefined
  if (!treadling.every((row) => ints(row, treadles.length))) return undefined
  if (!Array.isArray(weftColors) || weftColors.length !== treadling.length || !weftColors.every(isHex)) return undefined
  return { treadles, treadling, weftColors } as SavedWeft
}

/** Reads the block store from untrusted data, keeping the valid blocks. */
export function parseSavedBlocks(data: unknown): SavedBlock[] {
  if (!Array.isArray(data)) return []
  return data
    .filter(
      (s): s is SavedBlock =>
        s &&
        typeof s.name === 'string' &&
        Array.isArray(s.threading) &&
        s.threading.length > 0 &&
        s.threading.length <= MAX_ENDS &&
        s.threading.every((v: unknown) => Number.isInteger(v) && (v as number) >= -1 && (v as number) < 128) &&
        Array.isArray(s.warpColors) &&
        s.warpColors.length === s.threading.length &&
        s.warpColors.every(isHex),
    )
    .map((s) => {
      const { weft, ...rest } = s
      const w = parseWeft(weft)
      return { ...rest, ...(w ? { weft: w } : {}), updatedAt: Number(s.updatedAt) || 0 }
    })
    .slice(0, MAX_SAVED_BLOCKS)
}

export const BLOCK_STORE_KEY = 'weave-blocks'

export function loadSavedBlocks(): SavedBlock[] {
  try {
    return parseSavedBlocks(JSON.parse(localStorage.getItem(BLOCK_STORE_KEY) ?? '[]'))
  } catch {
    return []
  }
}

export function storeSavedBlocks(blocks: SavedBlock[]): boolean {
  try {
    localStorage.setItem(BLOCK_STORE_KEY, JSON.stringify(blocks))
    return true
  } catch {
    return false
  }
}

/** Adds (or overwrites, by name) a block in the store, newest first. */
export function putSavedBlock(store: SavedBlock[], block: SavedBlock): SavedBlock[] {
  const rest = store.filter((s) => s.name !== block.name)
  if (rest.length >= MAX_SAVED_BLOCKS)
    throw new Error(`The block store holds up to ${MAX_SAVED_BLOCKS} blocks. Delete one to make room.`)
  return [block, ...rest]
}

/** `xs` repeated (or cut) to `n` long. */
const fill = <T>(xs: T[], n: number): T[] => Array.from({ length: n }, (_, i) => xs[i % xs.length])

/** Shafts a block weave uses: its first shaft up to the highest it threads or lifts. */
const weaveShafts = (d: Draft, b: EndBlock): number[] => {
  const w = b.weave
  if (!w) return []
  const top = Math.max(...d.threading.slice(b.from, b.to + 1), w.offset + Math.max(0, ...w.lifts.flat()))
  return Array.from({ length: top - w.offset + 1 }, (_, k) => w.offset + k)
}

/**
 * The treadling rebuilt so every block with a preset weaves it all the way down, on its own shafts, each pick
 * lifting the next row of every block's preset; other ends keep what they had. Each different combination of
 * shafts becomes a treadle (added as needed).
 */
export function weaveBlocks(d: Draft): Draft {
  const woven = (d.blocks ?? []).flatMap((b) => (b.weave ? [{ ...b, weave: b.weave }] : []))
  if (!woven.length) return d
  const shafts = Math.max(d.shafts, ...woven.flatMap((b) => weaveShafts(d, b).map((s) => s + 1)))
  const owned = new Set(woven.flatMap((b) => weaveShafts(d, b)))
  const before = liftsPerPick(d)
  const lifts = before.map((base, p) => {
    const up = new Set(base.filter((s) => !owned.has(s)))
    for (const b of woven) {
      const w = b.weave
      for (const s of w.lifts[p % w.lifts.length]) up.add(w.offset + s)
    }
    return [...up].sort((a, b) => a - b)
  })
  // As a lift plan (a treadle per shaft), then back to a tie-up with a treadle for each shed.
  const plan: Draft = {
    ...d,
    shafts,
    treadles: shafts,
    tieup: Array.from({ length: shafts }, (_, s) => Array.from({ length: shafts }, (_, t) => s === t)),
    treadling: lifts.map((ss) => Array.from({ length: shafts }, (_, s) => ss.includes(s))),
  }
  const next = toTreadling(plan, MAX_TREADLES)
  return { ...next, blocks: d.blocks }
}

/**
 * Block i woven as a preset (or any pattern), all the way down: the part of the preset that fills the block's
 * columns (its threading, repeated across the block's ends), on shafts the block has to itself (more are added if
 * the rest of the pattern uses its own), and the preset's treadling down every pick for those shafts. Other blocks
 * with presets keep theirs, each on its own shafts, and the ends outside them keep their weave. With `colours`, the
 * block takes the preset's warp colours, and the whole pattern its weft colours (the weft crosses every block), unless
 * another block's preset set them first.
 */
export function presetIntoBlock(
  d: Draft,
  i: number,
  preset: Draft,
  opts: { name?: string; colours?: boolean; weftColours?: boolean } = {},
): Draft {
  const b = d.blocks?.[i]
  if (!b) return d
  const width = b.to - b.from + 1
  const lifts = liftsPerPick(preset)
  const used = preset.threading.filter((s) => s >= 0)
  const span = Math.max(Math.max(0, ...used), Math.max(0, ...lifts.flat())) + 1
  // The lowest run of shafts no end outside this block uses.
  const outside = new Set(d.threading.filter((s, e) => s >= 0 && (e < b.from || e > b.to)))
  for (const [j, other] of (d.blocks ?? []).entries())
    if (j !== i && other.weave) for (const s of weaveShafts(d, other)) outside.add(s)
  let offset = 0
  while (Array.from({ length: span }, (_, k) => offset + k).some((s) => outside.has(s))) offset++
  if (offset + span > MAX_SHAFTS) throw new Error(`That needs more than ${MAX_SHAFTS} shafts`)
  const colours = opts.colours !== false
  const threading = [...d.threading]
  const warpColors = [...d.warpColors]
  const repeat = fill(
    preset.threading.map((s) => (s < 0 ? -1 : s + offset)),
    width,
  )
  for (let k = 0; k < width; k++) {
    threading[b.from + k] = repeat[k]
    if (colours) warpColors[b.from + k] = preset.warpColors[k % preset.warpColors.length]
  }
  const blocks = (d.blocks ?? []).map((x, j) =>
    j === i ? { ...x, weave: { name: opts.name ?? '', offset, lifts: lifts.length ? lifts : [[]] } } : x,
  )
  // The weft crosses every block: it takes the preset's weft colours unless another block already set them.
  const others = (d.blocks ?? []).some((x, j) => j !== i && x.weave)
  const withWeft = colours && (opts.weftColours ?? !others)
  const next: Draft = {
    ...withShafts(d, offset + span),
    threading,
    warpColors,
    blocks,
    ...(withWeft ? { weftColors: fill(preset.weftColors, d.picks) } : {}),
  }
  return weaveBlocks(next)
}

/** Stops block i weaving its preset; its threading stays, and the treadling is rebuilt for the other blocks. */
export function unweaveBlock(d: Draft, i: number): Draft {
  const blocks = (d.blocks ?? []).map((x, j) => {
    if (j !== i) return x
    const { weave, ...rest } = x
    return rest
  })
  return { ...d, blocks }
}
