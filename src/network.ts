/**
 * Network and parallel threadings: two generators popular with dobby weavers, producing shaft sequences
 * (1-based) for the sequence tools.
 */

/** Linear interpolation through control points spread evenly over `length` ends, e.g. [1, 8, 1] → a wave. */
export function patternLine(points: number[], length: number): number[] {
  if (points.length === 0 || length < 1) return []
  if (points.length === 1 || length === 1) return Array(length).fill(points[0])
  return Array.from({ length }, (_, i) => {
    const t = (i / (length - 1)) * (points.length - 1)
    const k = Math.min(Math.floor(t), points.length - 2)
    return points[k] + (points[k + 1] - points[k]) * (t - k)
  })
}

/**
 * Network drafting with a straight-draw initial of `width` shafts: end i may only use shafts on its network
 * strand (shaft − 1 ≡ i mod width), and takes the one closest to the pattern line there (the lower on a tie).
 */
export function network(line: number[], shafts: number, width: number): number[] {
  if (!Number.isInteger(width) || width < 2 || width > shafts) throw new Error(`Initial width must be 2 to ${shafts}`)
  if (shafts % width !== 0)
    throw new Error(`The number of shafts (${shafts}) must be a multiple of the initial width (${width})`)
  return line.map((value, i) => {
    // Round away floating-point noise from interpolation so exact ties really are ties.
    const target = Math.round(value * 1e6) / 1e6
    let best = (i % width) + 1
    for (let s = best; s <= shafts; s += width) if (Math.abs(s - target) < Math.abs(best - target)) best = s
    return best
  })
}

/**
 * Parallel threading: each end of `base` is followed by a partner end `shift` shafts further on (wrapping), so
 * two lines of the pattern run side by side.
 */
export function parallel(base: number[], shafts: number, shift: number): number[] {
  if (!Number.isInteger(shift) || shift < 1 || shift >= shafts) throw new Error(`Shift must be 1 to ${shafts - 1}`)
  const bad = base.find((s) => s < 1 || s > shafts)
  if (bad !== undefined) throw new Error(`Shaft ${bad} doesn't exist; this draft has ${shafts} shafts`)
  return base.flatMap((s) => [s, ((s - 1 + shift) % shafts) + 1])
}
