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
  /**
   * A pattern woven in this block all the way down (a preset, or a block from the store), on shafts of its own:
   * every pick lifts the next row of it.
   */
  weave?: BlockWeave
}

/** What a block weaves, all the way down. */
export interface BlockWeave {
  name: string
  /** The block's first shaft (0-based): the pattern's shaft 1 is this one. */
  offset: number
  /** For each pick of the pattern's repeat, the shafts it lifts, counted from the block's first shaft. */
  lifts: number[][]
  /** The pattern's weft colours, for its repeat. */
  weftColors?: string[]
  /** The pattern's weft colours are the ones across the cloth (only one block's can be). */
  weft?: boolean
}

/**
 * A block kept in the block store, to use again in any pattern: its threading and warp colours, and what it weaves
 * all the way down (its own shafts' lifts, pick by pick, and its weft colours). Shafts are 0-based, -1 unthreaded.
 */
export interface SavedBlock {
  name: string
  threading: number[]
  warpColors: string[]
  /** How it weaves: the lifts are counted from `base`, the lowest shaft of its threading. */
  weave?: { base: number; lifts: number[][]; weftColors: string[] }
  updatedAt: number
}

export const MAX_SAVED_BLOCKS = 200
export const MAX_ENDS = 1000
const MAX_SHAFTS = 128
const MAX_REPEAT = 1000

/** A, B, … Z, then AA, AB, … */
export function blockLetter(i: number): string {
  return i < 26 ? String.fromCharCode(65 + i) : blockLetter(Math.floor(i / 26) - 1) + blockLetter(i % 26)
}

/** "A (1–4)": a block's letter and ends, counted from 1. */
export function blockTitle(blocks: EndBlock[], i: number): string {
  const b = blocks[i]
  return `${blockLetter(i)} (${b.from === b.to ? b.from + 1 : `${b.from + 1}–${b.to + 1}`})`
}

/** Blocks inside `ends`, in order along the warp, without overlaps (a later block gives way to an earlier one). */
export function cleanBlocks(blocks: EndBlock[], ends: number): EndBlock[] {
  const sorted = blocks
    .map((b) => ({ ...b, to: Math.min(b.to, ends - 1) }))
    .filter((b) => Number.isInteger(b.from) && Number.isInteger(b.to) && b.from >= 0 && b.from <= b.to)
    .sort((a, b) => a.from - b.from)
  const out: EndBlock[] = []
  for (const b of sorted) if (!out.length || b.from > out[out.length - 1].to) out.push(b)
  return out
}

const withBlocks = (d: Draft, blocks: EndBlock[]): Draft => ({ ...d, blocks: cleanBlocks(blocks, d.ends) })

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
  return addBlock({ ...d, blocks: d.blocks?.filter((_, j) => j !== i) }, from, to, b.name)
}

/** Takes the block's label away; its ends stay as they are. */
export function removeBlock(d: Draft, i: number): Draft {
  return withBlocks(
    d,
    (d.blocks ?? []).filter((_, j) => j !== i),
  )
}

/** `xs` repeated (or cut) to `n` long. */
const fill = <T>(xs: T[], n: number): T[] => Array.from({ length: n }, (_, i) => xs[i % xs.length])

/** The shortest run of picks that repeats to make them all (lifts and weft colours together). */
function repeatOf(lifts: number[][], colours: string[]): number {
  const same = (p: number, q: number) => lifts[p].join() === lifts[q].join() && colours[p] === colours[q]
  for (let n = 1; n < lifts.length; n++) if (lifts.every((_, p) => same(p, p % n))) return n
  return lifts.length
}

/**
 * Block i ready for the block store: its threading and warp colours, and how it weaves all the way down: the lifts of
 * its own shafts (and no others) on each pick, cut to their repeat, with the weft colours.
 */
export function blockContents(d: Draft, i: number, name: string): SavedBlock {
  const b = (d.blocks ?? [])[i]
  const threading = d.threading.slice(b.from, b.to + 1)
  const own = [...new Set(threading.filter((s) => s >= 0))]
  const base = b.weave ? b.weave.offset : own.length ? Math.min(...own) : 0
  let lifts: number[][]
  let weftColors: string[]
  if (b.weave) {
    lifts = b.weave.lifts
    weftColors = fill(b.weave.weftColors?.length ? b.weave.weftColors : d.weftColors, lifts.length)
  } else {
    const all = liftsPerPick(d).map((ss) => ss.filter((s) => own.includes(s)).map((s) => s - base))
    const n = repeatOf(all, d.weftColors)
    lifts = all.slice(0, n)
    weftColors = d.weftColors.slice(0, n)
  }
  return {
    name,
    threading,
    warpColors: d.warpColors.slice(b.from, b.to + 1),
    ...(lifts.length ? { weave: { base, lifts, weftColors } } : {}),
    updatedAt: Date.now(),
  }
}

/** Shafts a saved block needs, as it was saved. */
export const shaftsUsed = (s: SavedBlock) =>
  Math.max(Math.max(0, ...s.threading) + 1, s.weave ? s.weave.base + Math.max(0, ...s.weave.lifts.flat()) + 1 : 0)

/** Picks a saved block's pattern repeats over. */
export const repeatPicks = (s: SavedBlock) => s.weave?.lifts.length ?? 0

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

/** Shafts a block weave uses: its first shaft up to the highest it threads or lifts. */
const weaveShafts = (d: Draft, b: EndBlock): number[] => {
  const w = b.weave
  if (!w) return []
  const top = Math.max(...d.threading.slice(b.from, b.to + 1), w.offset + Math.max(0, ...w.lifts.flat()))
  return Array.from({ length: top - w.offset + 1 }, (_, k) => w.offset + k)
}

/**
 * The treadling rebuilt so every block weaving a pattern weaves it all the way down, on its own shafts, each pick
 * lifting the next row of every block's pattern; other ends keep what they had. Each different combination of
 * shafts becomes a treadle (added as needed). The weft colours follow the block chosen for them, if any.
 */
export function weaveBlocks(d: Draft): Draft {
  const woven = (d.blocks ?? []).flatMap((b) => (b.weave ? [{ ...b, weave: b.weave }] : []))
  if (!woven.length) return d
  const shafts = Math.max(d.shafts, ...woven.flatMap((b) => weaveShafts(d, b).map((s) => s + 1)))
  const owned = new Set(woven.flatMap((b) => weaveShafts(d, b)))
  const lifts = liftsPerPick(d).map((base, p) => {
    const up = new Set(base.filter((s) => !owned.has(s)))
    for (const b of woven) for (const s of b.weave.lifts[p % b.weave.lifts.length]) up.add(b.weave.offset + s)
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
  const next = toTreadling(plan, MAX_SHAFTS)
  const weft = woven.find((b) => b.weave.weft && b.weave.weftColors?.length)?.weave.weftColors
  return { ...next, blocks: d.blocks, ...(weft ? { weftColors: fill(weft, d.picks) } : {}) }
}

/** A pattern for a block to weave: its threading (shaft 0 its lowest), warp colours, lifts and weft colours. */
interface Weaving {
  name: string
  threading: number[]
  warpColors: string[]
  lifts: number[][]
  weftColors: string[]
}

/**
 * Block i weaving a pattern all the way down: the part of it that fills the block's columns (its threading repeated
 * across them), on shafts the block has to itself (the lowest run no other end uses; more are added if needed), and
 * its lifts down every pick for those shafts. Other blocks weaving patterns keep theirs, and the ends outside them
 * keep their weave. The block takes the pattern's warp colours unless `colours` is false, and its weft colours become
 * the cloth's unless `weft` is false.
 */
function weaveInto(d: Draft, i: number, w: Weaving, opts: { colours?: boolean; weft?: boolean } = {}): Draft {
  const b = d.blocks?.[i]
  if (!b) return d
  const width = b.to - b.from + 1
  const lifts = w.lifts.length ? w.lifts : [[]]
  const used = w.threading.filter((s) => s >= 0)
  const span = Math.max(Math.max(0, ...used), Math.max(0, ...lifts.flat())) + 1
  const outside = new Set(d.threading.filter((s, e) => s >= 0 && (e < b.from || e > b.to)))
  for (const [j, other] of (d.blocks ?? []).entries())
    if (j !== i && other.weave) for (const s of weaveShafts(d, other)) outside.add(s)
  let offset = 0
  while (Array.from({ length: span }, (_, k) => offset + k).some((s) => outside.has(s))) offset++
  if (offset + span > MAX_SHAFTS) throw new Error(`That needs more than ${MAX_SHAFTS} shafts`)
  const colours = opts.colours !== false
  const weft = colours && opts.weft !== false
  const threading = [...d.threading]
  const warpColors = [...d.warpColors]
  const repeat = fill(
    w.threading.map((s) => (s < 0 ? -1 : s + offset)),
    width,
  )
  for (let k = 0; k < width; k++) {
    threading[b.from + k] = repeat[k]
    if (colours) warpColors[b.from + k] = w.warpColors[k % w.warpColors.length]
  }
  const weave: BlockWeave = { name: w.name, offset, lifts, weftColors: w.weftColors, ...(weft ? { weft: true } : {}) }
  const blocks = (d.blocks ?? []).map((x, j) => {
    if (j === i) return { ...x, weave }
    // Only one block's weft colours cross the cloth: the newest.
    if (weft && x.weave?.weft) {
      const { weft: _, ...rest } = x.weave
      return { ...x, weave: rest }
    }
    return x
  })
  return weaveBlocks({ ...withShafts(d, offset + span), threading, warpColors, blocks })
}

/** A pattern (a preset, say) as something for a block to weave: shaft numbers from its lowest. */
function weavingOf(name: string, p: Draft): Weaving {
  const used = p.threading.filter((s) => s >= 0)
  const low = used.length ? Math.min(...used) : 0
  const all = liftsPerPick(p).map((ss) => ss.filter((s) => s >= low).map((s) => s - low))
  // Just its repeat.
  const n = repeatOf(all, p.weftColors)
  const lifts = all.slice(0, n)
  return {
    name,
    threading: p.threading.map((s) => (s < 0 ? -1 : s - low)),
    warpColors: p.warpColors,
    lifts,
    weftColors: p.weftColors.slice(0, n),
  }
}

/** A saved block as something to weave, or null when it was saved without a weave. */
function weavingOfSaved(s: SavedBlock): Weaving | null {
  if (!s.weave) return null
  const base = s.weave.base
  return {
    name: s.name,
    threading: s.threading.map((x) => (x < 0 ? -1 : x - base)),
    warpColors: s.warpColors,
    lifts: s.weave.lifts,
    weftColors: s.weave.weftColors,
  }
}

/**
 * Block i woven as a preset (or any pattern), all the way down, on its own shafts; several blocks can each weave
 * their own. With `colours` (the default) the block takes the preset's warp colours and the cloth its weft colours.
 */
export function presetIntoBlock(
  d: Draft,
  i: number,
  preset: Draft,
  opts: { name?: string; colours?: boolean; weft?: boolean } = {},
): Draft {
  return weaveInto(d, i, weavingOf(opts.name ?? '', preset), opts)
}

/** Stops block i weaving its pattern; its threading and the treadling stay as they are. */
export function unweaveBlock(d: Draft, i: number): Draft {
  const blocks = (d.blocks ?? []).map((x, j) => {
    if (j !== i) return x
    const { weave, ...rest } = x
    return rest
  })
  return { ...d, blocks }
}

/** Which block's pattern gives the cloth its weft colours (null: leave them as they are). */
export function setWeftFrom(d: Draft, i: number | null): Draft {
  const blocks = (d.blocks ?? []).map((x, j) => {
    if (!x.weave) return x
    const { weft: _, ...rest } = x.weave
    return { ...x, weave: j === i ? { ...rest, weft: true } : rest }
  })
  return weaveBlocks({ ...d, blocks })
}

/** The block whose pattern gives the cloth its weft colours, if one does. */
export const weftBlock = (d: Draft) => (d.blocks ?? []).findIndex((b) => b.weave?.weft)

/**
 * Splices `count` ends at `at` for `saved`'s ends (shifting the blocks after them along) and makes them a block named
 * after it, weaving its pattern all the way down if it has one; otherwise its threading goes in as it was saved.
 */
function splice(d: Draft, at: number, count: number, saved: SavedBlock, replacing?: number): Draft {
  const ends = d.ends - count + saved.threading.length
  if (ends > MAX_ENDS) throw new Error(`That would make ${ends} ends: patterns can have up to ${MAX_ENDS}`)
  const weaving = weavingOfSaved(saved)
  const grown = weaving ? d : withShafts(d, shaftsUsed(saved))
  const shift = saved.threading.length - count
  const blocks = (d.blocks ?? [])
    .filter((_, j) => j !== replacing)
    .map((b) => (b.from >= at + count ? { ...b, from: b.from + shift, to: b.to + shift } : b))
  // Unthreaded until woven, so the shafts it gets are its own.
  const filler = weaving ? saved.threading.map(() => -1) : saved.threading
  const next: Draft = {
    ...grown,
    ends,
    threading: [...d.threading.slice(0, at), ...filler, ...d.threading.slice(at + count)],
    warpColors: [...d.warpColors.slice(0, at), ...saved.warpColors, ...d.warpColors.slice(at + count)],
    blocks,
  }
  const placed = addBlock(next, at, at + saved.threading.length - 1, saved.name)
  if (!weaving) return weaveBlocks(placed)
  const i = (placed.blocks ?? []).findIndex((b) => b.from === at)
  return weaveInto(placed, i, weaving)
}

/** Puts a saved block in before end `at` (0-based; `ends` adds it at the end), weaving its pattern all the way down. */
export function insertBlock(d: Draft, saved: SavedBlock, at: number): Draft {
  return splice(d, Math.max(0, Math.min(d.ends, at)), 0, saved)
}

/** Swaps the ends of block i for a saved block, which may be longer or shorter, weaving its pattern all the way down. */
export function replaceBlock(d: Draft, i: number, saved: SavedBlock): Draft {
  const b = d.blocks?.[i]
  if (!b) return d
  return splice(d, b.from, b.to - b.from + 1, saved, i)
}

/** The next unused "Saved block N" name. */
export function nextBlockName(taken: string[]): string {
  let n = 1
  while (taken.includes(`Saved block ${n}`)) n++
  return `Saved block ${n}`
}

const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
const shaftList = (row: unknown, below = MAX_SHAFTS) =>
  Array.isArray(row) && row.every((s) => Number.isInteger(s) && s >= 0 && s < below)

/** A block's weave from untrusted data, if it's valid. */
function parseWeave(w: unknown): BlockWeave | undefined {
  if (!w || typeof w !== 'object') return undefined
  const { name, offset, lifts, weftColors, weft } = w as Record<string, unknown>
  if (!Number.isInteger(offset) || (offset as number) < 0 || (offset as number) >= MAX_SHAFTS) return undefined
  if (!Array.isArray(lifts) || !lifts.length || lifts.length > MAX_REPEAT) return undefined
  if (!lifts.every((row) => shaftList(row, MAX_SHAFTS - (offset as number)))) return undefined
  const colours = Array.isArray(weftColors) && weftColors.length && weftColors.every(isHex) ? weftColors : undefined
  return {
    name: typeof name === 'string' ? name.slice(0, 80) : '',
    offset: offset as number,
    lifts,
    ...(colours ? { weftColors: colours } : {}),
    ...(weft === true ? { weft: true } : {}),
  }
}

/** Reads blocks from untrusted data, keeping the valid ones. */
export function parseBlocks(data: unknown, ends: number): EndBlock[] {
  if (!Array.isArray(data)) return []
  return cleanBlocks(
    data
      .filter((b) => b && typeof b === 'object')
      .map((b) => {
        const weave = parseWeave(b.weave)
        return {
          from: b.from,
          to: b.to,
          name: typeof b.name === 'string' ? b.name.slice(0, 80) : '',
          ...(weave ? { weave } : {}),
        }
      }),
    ends,
  )
}

/**
 * A saved block's weave from untrusted data: as saved now, or from a block saved with its picks' treadles (before
 * blocks wove all the way down), keeping only its own shafts.
 */
function parseSavedWeave(s: Record<string, unknown>, threading: number[]): SavedBlock['weave'] | undefined {
  const w = s.weave as Record<string, unknown> | undefined
  if (w && typeof w === 'object') {
    const { base, lifts, weftColors } = w
    if (!Number.isInteger(base) || (base as number) < 0 || (base as number) >= MAX_SHAFTS) return undefined
    if (!Array.isArray(lifts) || !lifts.length || lifts.length > MAX_REPEAT || !lifts.every((r) => shaftList(r)))
      return undefined
    if (!Array.isArray(weftColors) || weftColors.length !== lifts.length || !weftColors.every(isHex)) return undefined
    return { base: base as number, lifts, weftColors }
  }
  const old = s.weft as Record<string, unknown> | undefined
  if (!old || typeof old !== 'object') return undefined
  const { treadles, treadling, weftColors } = old
  if (!Array.isArray(treadles) || !treadles.every((t) => shaftList(t))) return undefined
  if (!Array.isArray(treadling) || !treadling.length || treadling.length > MAX_REPEAT) return undefined
  if (!treadling.every((row) => shaftList(row, treadles.length))) return undefined
  if (!Array.isArray(weftColors) || weftColors.length !== treadling.length || !weftColors.every(isHex)) return undefined
  const own = [...new Set(threading.filter((x) => x >= 0))]
  const base = own.length ? Math.min(...own) : 0
  const lifts = treadling.map((row: number[]) =>
    [...new Set(row.flatMap((k) => treadles[k] as number[]))]
      .filter((x) => own.includes(x))
      .map((x) => x - base)
      .sort((a, b) => a - b),
  )
  return { base, lifts, weftColors }
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
        s.threading.every((v: unknown) => Number.isInteger(v) && (v as number) >= -1 && (v as number) < MAX_SHAFTS) &&
        Array.isArray(s.warpColors) &&
        s.warpColors.length === s.threading.length &&
        s.warpColors.every(isHex),
    )
    .map((s) => {
      const weave = parseSavedWeave(s as unknown as Record<string, unknown>, s.threading)
      return {
        name: s.name,
        threading: s.threading,
        warpColors: s.warpColors,
        ...(weave ? { weave } : {}),
        updatedAt: Number(s.updatedAt) || 0,
      }
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
