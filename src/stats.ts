import { longestFloats } from './floats'
import { computeDrawdown, type Draft } from './weave'

export interface ClothStats {
  /** Share of the face that is warp (0–1). */
  warpFace: number
  /** Share of neighbouring crossings where the threads swap over: 1 for plain weave, 0.5 for 2/2 twill. */
  interlacing: number
  /** Average float length, in threads, along the warp and along the weft. */
  averageFloat: { warp: number; weft: number }
  longestFloat: { warp: number; weft: number }
  /** A plain-language reading of how firm the cloth will be. */
  firmness: 'very firm' | 'firm' | 'balanced' | 'soft' | 'loose'
}

/**
 * Lengths of the runs of `value` in a line (a float is a run of the same thread on top). Runs cut off by the edge
 * of the draft are left out, as they'd carry on into the next repeat.
 */
const runs = (line: boolean[], value: boolean) => {
  const lengths: number[] = []
  let run = 0
  for (const v of line) {
    if (v === value) run++
    else if (run > 0) {
      lengths.push(run)
      run = 0
    }
  }
  if (run > 0) lengths.push(run)
  const cut = (line[0] === value ? 1 : 0) + (line[line.length - 1] === value ? 1 : 0)
  return lengths.length > cut
    ? lengths.slice(line[0] === value ? 1 : 0, line[line.length - 1] === value ? -1 : undefined)
    : lengths
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Statistics about the cloth's structure: how warp- or weft-faced, how often threads interlace, and float lengths. */
export function clothStats(d: Draft, dd = computeDrawdown(d)): ClothStats {
  const threaded = d.threading.flatMap((s, e) => (s >= 0 ? [e] : []))
  const woven = d.treadling.flatMap((row, p) => (row.some(Boolean) ? [p] : []))
  let up = 0
  let swaps = 0
  let pairs = 0
  for (const p of woven)
    threaded.forEach((e, i) => {
      if (dd[p][e]) up++
      if (i > 0) {
        pairs++
        if (dd[p][e] !== dd[p][threaded[i - 1]]) swaps++
      }
    })
  for (const e of threaded)
    woven.forEach((p, i) => {
      if (i > 0) {
        pairs++
        if (dd[p][e] !== dd[woven[i - 1]][e]) swaps++
      }
    })
  const cells = threaded.length * woven.length
  const interlacing = pairs ? swaps / pairs : 0
  const warpRuns = threaded.flatMap((e) =>
    runs(
      woven.map((p) => dd[p][e]),
      true,
    ),
  )
  const weftRuns = woven.flatMap((p) =>
    runs(
      threaded.map((e) => dd[p][e]),
      false,
    ),
  )
  const firmness =
    interlacing >= 0.9
      ? 'very firm'
      : interlacing >= 0.6
        ? 'firm'
        : interlacing >= 0.4
          ? 'balanced'
          : interlacing >= 0.25
            ? 'soft'
            : 'loose'
  return {
    warpFace: cells ? up / cells : 0,
    interlacing,
    averageFloat: { warp: mean(warpRuns), weft: mean(weftRuns) },
    longestFloat: longestFloats(d, dd),
    firmness,
  }
}
