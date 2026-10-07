import * as z from 'zod'
import { type Draft, parseDraft } from '../src/weave'

/**
 * The pattern format AIs write: 1-based shaft and treadle numbers, threading/treadling given as one repeat
 * that is cycled to fill `ends`/`picks`, and colour sequences cycled the same way.
 */
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Colours must be #rrggbb hex')
const positive = z.number().int().min(1)

export const patternShape = {
  name: z.string().min(1).max(100).describe('Pattern name'),
  shafts: z.number().int().min(1).max(32).describe('Number of shafts'),
  treadles: z
    .number()
    .int()
    .min(1)
    .max(32)
    .optional()
    .describe('Number of treadles (defaults to the highest treadle used). Omit when using liftplan.'),
  threading: z
    .array(z.number().int().min(0))
    .min(1)
    .describe('Shaft for each warp end, left to right, 1-based; 0 leaves the end unthreaded. Repeated to fill `ends`.'),
  tieup: z
    .array(z.array(positive))
    .optional()
    .describe('For treadle 1, 2, …: the shafts it lifts (rising shed). Required unless `liftplan` is given.'),
  treadling: z
    .array(z.union([z.number().int().min(0), z.array(positive)]))
    .optional()
    .describe(
      'Treadle(s) pressed for each pick, top to bottom: a number, a list for several treadles, or 0 for none. Repeated to fill `picks`.',
    ),
  liftplan: z
    .array(z.array(z.number().int().min(0)))
    .optional()
    .describe(
      'Alternative to tieup + treadling (dobby looms): the shafts lifted on each pick. Repeated to fill `picks`.',
    ),
  ends: z.number().int().min(1).max(400).optional().describe('Warp ends (defaults to the threading length)'),
  picks: z.number().int().min(1).max(400).optional().describe('Weft picks (defaults to the treadling length)'),
  warp_colors: z
    .array(hex)
    .min(1)
    .optional()
    .describe('Warp colour sequence, cycled across the ends (default dark red)'),
  weft_colors: z.array(hex).min(1).optional().describe('Weft colour sequence, cycled down the picks (default white)'),
}

export const patternSchema = z.object(patternShape)
export type PatternSpec = z.infer<typeof patternSchema>

const cycle = <T>(seq: T[], length: number): T[] => Array.from({ length }, (_, i) => seq[i % seq.length])

/** Builds and validates a Draft, throwing a message an AI can act on if the spec is inconsistent. */
export function specToDraft(spec: PatternSpec): Draft {
  const { shafts } = spec
  const ends = spec.ends ?? spec.threading.length
  const badShaft = spec.threading.find((s) => s > shafts)
  if (badShaft !== undefined) throw new Error(`threading uses shaft ${badShaft} but there are only ${shafts} shafts`)
  const threading = cycle(spec.threading, ends).map((s) => s - 1)

  let treadles: number
  let tieup: boolean[][]
  let rows: number[][]
  if (spec.liftplan) {
    if (spec.tieup || spec.treadling) throw new Error('Give either liftplan or tieup + treadling, not both')
    const bad = spec.liftplan.flat().find((s) => s > shafts)
    if (bad !== undefined) throw new Error(`liftplan lifts shaft ${bad} but there are only ${shafts} shafts`)
    // A lift plan is a straight tie-up with one treadle per shaft.
    treadles = shafts
    tieup = Array.from({ length: shafts }, (_, s) => Array.from({ length: treadles }, (_, t) => s === t))
    rows = spec.liftplan.map((ss) => ss.filter((s) => s > 0))
  } else {
    if (!spec.tieup || !spec.treadling) throw new Error('Give tieup and treadling, or a liftplan')
    rows = spec.treadling.map((t) => (Array.isArray(t) ? t : t === 0 ? [] : [t]))
    treadles = spec.treadles ?? Math.max(spec.tieup.length, ...rows.flat())
    if (spec.tieup.length > treadles)
      throw new Error(`tieup has ${spec.tieup.length} treadles but treadles is ${treadles}`)
    const badT = rows.flat().find((t) => t > treadles)
    if (badT !== undefined) throw new Error(`treadling uses treadle ${badT} but there are only ${treadles} treadles`)
    const badS = spec.tieup.flat().find((s) => s > shafts)
    if (badS !== undefined) throw new Error(`tieup lifts shaft ${badS} but there are only ${shafts} shafts`)
    const tie = spec.tieup
    tieup = Array.from({ length: shafts }, (_, s) =>
      Array.from({ length: treadles }, (_, t) => (tie[t] ?? []).includes(s + 1)),
    )
  }
  const picks = spec.picks ?? rows.length
  const treadling = cycle(rows, picks).map((pressed) =>
    Array.from({ length: treadles }, (_, t) => pressed.includes(t + 1)),
  )

  return parseDraft({
    shafts,
    treadles,
    ends,
    picks,
    threading,
    tieup,
    treadling,
    warpColors: cycle(
      (spec.warp_colors ?? ['#8b0a0a']).map((c) => c.toLowerCase()),
      ends,
    ),
    weftColors: cycle(
      (spec.weft_colors ?? ['#ffffff']).map((c) => c.toLowerCase()),
      picks,
    ),
  })
}

/** The inverse of specToDraft, so an AI can read a file, tweak the spec and create it again. */
export function draftToSpec(name: string, d: Draft): PatternSpec {
  return {
    name,
    shafts: d.shafts,
    treadles: d.treadles,
    threading: d.threading.map((s) => s + 1),
    tieup: Array.from({ length: d.treadles }, (_, t) => d.tieup.flatMap((row, s) => (row[t] ? [s + 1] : []))),
    treadling: d.treadling.map((row) => {
      const ts = row.flatMap((on, t) => (on ? [t + 1] : []))
      return ts.length === 1 ? ts[0] : ts.length === 0 ? 0 : ts
    }),
    ends: d.ends,
    picks: d.picks,
    warp_colors: d.warpColors,
    weft_colors: d.weftColors,
  }
}
