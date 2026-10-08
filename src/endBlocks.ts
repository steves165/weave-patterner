import type { Draft } from './weave'

/**
 * A named block of ends: a stretch of the threading (with its warp colours), marked above the columns as A, B, C …
 * from end 1. Blocks don't overlap. `from` and `to` are 0-based end indices, both included.
 */
export interface EndBlock {
  from: number
  to: number
  name: string
}

/** A block kept in the block store, to use again in any pattern. Shafts are 0-based, -1 unthreaded. */
export interface SavedBlock {
  name: string
  threading: number[]
  warpColors: string[]
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

/** The threading and warp colours of block i, ready for the block store. */
export function blockContents(d: Draft, i: number, name: string): SavedBlock {
  const b = (d.blocks ?? [])[i]
  return {
    name,
    threading: d.threading.slice(b.from, b.to + 1),
    warpColors: d.warpColors.slice(b.from, b.to + 1),
    updatedAt: Date.now(),
  }
}

/** Shafts a saved block needs. */
export const shaftsUsed = (s: SavedBlock) => Math.max(0, ...s.threading) + 1

/** Adds shafts (with nothing tied up or lifted on them) so that a block fits. */
function withShafts(d: Draft, shafts: number): Draft {
  if (shafts <= d.shafts) return d
  const extra = shafts - d.shafts
  // Without a tie-up (a lift plan), each treadle column is a shaft, so they grow together.
  const liftplan = d.shafts === d.treadles && d.tieup.every((row, s) => row.every((on, t) => on === (s === t)))
  if (liftplan)
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

/**
 * Splices `count` ends at `at` for `saved`'s ends, shifting the blocks after them along and keeping the new ends as a
 * block named after the saved one. Shafts are added if the block needs more.
 */
function splice(d: Draft, at: number, count: number, saved: SavedBlock, replacing?: number): Draft {
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
  return addBlock(next, at, at + saved.threading.length - 1, saved.name)
}

/** Puts a saved block in before end `at` (0-based; `ends` adds it at the end). */
export function insertBlock(d: Draft, saved: SavedBlock, at: number): Draft {
  return splice(d, Math.max(0, Math.min(d.ends, at)), 0, saved)
}

/** Swaps the ends of block i for a saved block, which may be longer or shorter. */
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

/** Reads blocks from untrusted data, keeping the valid ones. */
export function parseBlocks(data: unknown, ends: number): EndBlock[] {
  if (!Array.isArray(data)) return []
  return cleanBlocks(
    data
      .filter((b) => b && typeof b === 'object')
      .map((b) => ({ from: b.from, to: b.to, name: typeof b.name === 'string' ? b.name.slice(0, 80) : '' })),
    ends,
  )
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
    .map((s) => ({ ...s, updatedAt: Number(s.updatedAt) || 0 }))
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
