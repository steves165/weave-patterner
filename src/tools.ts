import { type Draft, parseDraft } from './weave'

/** Ends and picks the editor allows; larger drafts get slow to edit. */
export const MAX_THREADS = 400

export type Target = 'threading' | 'treadling'

/**
 * Parses a sequence like "1 2 3 4 3 2", "1-4, 3-2" or "1,0,3" into numbers. Ranges count up or down.
 * Throws a readable error for anything else.
 */
export function parseSequence(text: string): number[] {
  const out: number[] = []
  for (const token of text.split(/[\s,]+/).filter(Boolean)) {
    const range = /^(\d+)-(\d+)$/.exec(token)
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])]
      const step = a <= b ? 1 : -1
      for (let n = a; n !== b + step; n += step) out.push(n)
    } else if (/^\d+$/.test(token)) out.push(Number(token))
    else throw new Error(`"${token}" isn't a number or range like 1-4`)
  }
  if (out.length === 0) throw new Error('Enter at least one number')
  return out
}

/** 1 2 … n */
export const straight = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

/** 1 2 … n … 2 (one repeat of a point draw; the next repeat starts on 1 again). */
export const point = (n: number) => [...straight(n), ...straight(n).reverse().slice(1, -1)]

/** Runs of `run` consecutive numbers, each starting `step` further on, until the start comes back to 1. */
export function advancing(n: number, run: number, step: number): number[] {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const runs = n / gcd(n, step)
  const out: number[] = []
  for (let r = 0; r < runs; r++) for (let i = 0; i < run; i++) out.push(((r * step + i) % n) + 1)
  return out
}

/** Operations on a 1-based inclusive range [from, to] of ends (threading) or picks (treadling). */
export type RangeOp =
  | { kind: 'fill'; sequence: number[] }
  | { kind: 'repeat'; times: number }
  | { kind: 'mirror' }
  | { kind: 'reverse' }
  | { kind: 'delete' }
  | { kind: 'insert'; count: number }

/** One end or pick: its threading/treadling value plus its colour, so colours move with their threads. */
interface Unit<V> {
  value: V
  color: string
}

function applyOp<V>(
  units: Unit<V>[],
  from: number,
  to: number,
  op: RangeOp,
  make: (n: number) => V,
  blank: V,
  color: string,
) {
  const [a, b] = [from - 1, to] // slice bounds
  const range = units.slice(a, b)
  switch (op.kind) {
    case 'fill':
      return [
        ...units.slice(0, a),
        ...range.map((u, i) => ({ ...u, value: make(op.sequence[i % op.sequence.length]) })),
        ...units.slice(b),
      ]
    case 'repeat':
      return [...units.slice(0, b), ...Array.from({ length: op.times }, () => range).flat(), ...units.slice(b)]
    case 'mirror':
      // 1 2 3 4 → 1 2 3 4 3 2 1: append the range reversed, without repeating the turning thread.
      return [...units.slice(0, b), ...range.slice(0, -1).reverse(), ...units.slice(b)]
    case 'reverse':
      return [...units.slice(0, a), ...range.reverse(), ...units.slice(b)]
    case 'delete':
      return [...units.slice(0, a), ...units.slice(b)]
    case 'insert':
      return [
        ...units.slice(0, a),
        ...Array.from({ length: op.count }, () => ({ value: blank, color })),
        ...units.slice(a),
      ]
  }
}

/** Applies a range operation to the threading or treadling, keeping colours attached to their threads. */
export function applyRangeOp(d: Draft, target: Target, from: number, to: number, op: RangeOp): Draft {
  const length = target === 'threading' ? d.ends : d.picks
  const last = op.kind === 'insert' ? length + 1 : length
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > last)
    throw new Error(`Choose a range between 1 and ${length}`)

  let result: Draft
  if (target === 'threading') {
    if (op.kind === 'fill') {
      const bad = op.sequence.find((s) => s > d.shafts)
      if (bad !== undefined) throw new Error(`Shaft ${bad} doesn't exist; this draft has ${d.shafts} shafts`)
    }
    const units = d.threading.map((value, i) => ({ value, color: d.warpColors[i] }))
    const out = applyOp(units, from, to, op, (n) => n - 1, -1, d.warpColors[from - 2] ?? d.warpColors[0])
    result = { ...d, ends: out.length, threading: out.map((u) => u.value), warpColors: out.map((u) => u.color) }
  } else {
    if (op.kind === 'fill') {
      const bad = op.sequence.find((t) => t > d.treadles)
      if (bad !== undefined) throw new Error(`Treadle ${bad} doesn't exist; this draft has ${d.treadles} treadles`)
    }
    const units = d.treadling.map((value, i) => ({ value, color: d.weftColors[i] }))
    const row = (t: number) => Array.from({ length: d.treadles }, (_, i) => i === t - 1)
    const out = applyOp(units, from, to, op, row, row(0), d.weftColors[from - 2] ?? d.weftColors[0])
    result = { ...d, picks: out.length, treadling: out.map((u) => u.value), weftColors: out.map((u) => u.color) }
  }
  const size = target === 'threading' ? result.ends : result.picks
  if (size < 1) throw new Error(`A draft needs at least one ${target === 'threading' ? 'end' : 'pick'}`)
  if (size > MAX_THREADS)
    throw new Error(`That would make ${size} ${target === 'threading' ? 'ends' : 'picks'}; the limit is ${MAX_THREADS}`)
  return parseDraft(result)
}

/**
 * Tromp as writ ("treadle as drawn in"): pick n uses the treadle numbered like the shaft end n is threaded on,
 * so the treadling follows the threading. Returns the draft and how many picks got no treadle (an unthreaded
 * end, or a shaft numbered higher than the last treadle).
 */
export function trompAsWrit(d: Draft): { draft: Draft; skipped: number } {
  let skipped = 0
  const treadling = d.threading.map((s) => {
    if (s < 0 || s >= d.treadles) skipped++
    return Array.from({ length: d.treadles }, (_, t) => t === s)
  })
  const weftColors = Array.from({ length: d.ends }, (_, i) => d.weftColors[i] ?? d.weftColors[d.weftColors.length - 1])
  return { draft: parseDraft({ ...d, picks: d.ends, treadling, weftColors }), skipped }
}

/** Copied ends or picks: the shafts/treadles of each (1-based; empty for none) and its colour. */
export interface Clip {
  source: Target
  items: { nums: number[]; color: string }[]
}

/** Copies ends (threading) or picks (treadling) from..to, 1-based inclusive. */
export function copyRange(d: Draft, target: Target, from: number, to: number): Clip {
  const length = target === 'threading' ? d.ends : d.picks
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to < from || to > length)
    throw new Error(`Choose a range between 1 and ${length}`)
  const items = []
  for (let i = from - 1; i < to; i++)
    items.push(
      target === 'threading'
        ? { nums: d.threading[i] >= 0 ? [d.threading[i] + 1] : [], color: d.warpColors[i] }
        : { nums: d.treadling[i].flatMap((on, t) => (on ? [t + 1] : [])), color: d.weftColors[i] },
    )
  return { source: target, items }
}

/**
 * Pastes a clip at position `at` (1-based) of the threading or treadling: 'overwrite' replaces the threads from
 * there on (growing the draft if it runs past the end), 'insert' adds them before `at`. A clip can be pasted into
 * the other target too (shaft numbers become treadle numbers and vice versa); an end takes only one shaft.
 */
export function pasteClip(
  d: Draft,
  target: Target,
  at: number,
  clip: Clip,
  mode: 'overwrite' | 'insert',
  withColors = true,
): Draft {
  const length = target === 'threading' ? d.ends : d.picks
  if (!Number.isInteger(at) || at < 1 || at > length + 1)
    throw new Error(`Paste position must be between 1 and ${length + 1}`)
  const limit = target === 'threading' ? d.shafts : d.treadles
  const bad = clip.items.flatMap((i) => i.nums).find((n) => n > limit)
  if (bad !== undefined)
    throw new Error(
      `The copied threads use ${target === 'threading' ? 'shaft' : 'treadle'} ${bad}; this draft has ${limit} ${target === 'threading' ? 'shafts' : 'treadles'}`,
    )

  const values = clip.items.map((i) =>
    target === 'threading'
      ? i.nums.length
        ? i.nums[0] - 1
        : -1
      : Array.from({ length: d.treadles }, (_, t) => i.nums.includes(t + 1)),
  )
  const colorsOf = (existing: string[], start: number) =>
    clip.items.map((item, k) => (withColors ? item.color : (existing[start + k] ?? existing[existing.length - 1])))

  const splice = <T>(arr: T[], pasted: T[]) => {
    const i = at - 1
    return mode === 'insert'
      ? [...arr.slice(0, i), ...pasted, ...arr.slice(i)]
      : [...arr.slice(0, i), ...pasted, ...arr.slice(i + pasted.length)]
  }

  const result =
    target === 'threading'
      ? (() => {
          const threading = splice(d.threading, values as number[])
          return {
            ...d,
            ends: threading.length,
            threading,
            warpColors: splice(d.warpColors, colorsOf(d.warpColors, at - 1)),
          }
        })()
      : (() => {
          const treadling = splice(d.treadling, values as boolean[][])
          return {
            ...d,
            picks: treadling.length,
            treadling,
            weftColors: splice(d.weftColors, colorsOf(d.weftColors, at - 1)),
          }
        })()
  const size = target === 'threading' ? result.ends : result.picks
  if (size > MAX_THREADS)
    throw new Error(`That would make ${size} ${target === 'threading' ? 'ends' : 'picks'}; the limit is ${MAX_THREADS}`)
  return parseDraft(result)
}

/** How a drag across the threading or treadling draws: one box at a time, or a straight or point draw. */
export type DrawTool = 'click' | 'straight' | 'point'

/**
 * Positions (0-based shafts or treadles) for `steps` threads drawn from `start` in `direction` (+1 up, −1 down)
 * among `count`. A straight draw wraps round (1 2 3 4 1 2 …); a point draw turns back at the ends without
 * repeating them (1 2 3 4 3 2 1 2 …).
 */
export function drawRun(tool: 'straight' | 'point', start: number, steps: number, count: number, direction: 1 | -1) {
  const out = [start]
  let pos = start
  let dir = direction
  for (let i = 1; i < steps; i++) {
    if (tool === 'straight') pos = (pos + dir + count) % count
    else {
      if (count > 1 && (pos + dir < 0 || pos + dir >= count)) dir = dir === 1 ? -1 : 1
      pos = count > 1 ? pos + dir : 0
    }
    out.push(pos)
  }
  return out
}

/**
 * Fills ends (threading) or picks (treadling) from `from` to `to` with a straight or point draw starting at
 * position `start` on `from`. Dragging backwards (to < from) draws backwards from the start too.
 */
export function drawAlong(
  d: Draft,
  target: Target,
  tool: 'straight' | 'point',
  from: number,
  to: number,
  start: number,
  direction: 1 | -1,
): Draft {
  const steps = Math.abs(to - from) + 1
  const step = to >= from ? 1 : -1
  if (target === 'threading') {
    const run = drawRun(tool, start, steps, d.shafts, direction)
    const threading = [...d.threading]
    run.forEach((s, i) => {
      threading[from + i * step] = s
    })
    return { ...d, threading }
  }
  const run = drawRun(tool, start, steps, d.treadles, direction)
  const treadling = [...d.treadling]
  run.forEach((t, i) => {
    treadling[from + i * step] = Array.from({ length: d.treadles }, (_, k) => k === t)
  })
  return { ...d, treadling }
}
