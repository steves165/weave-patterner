import { liftsPerPick } from './liftplan'
import type { Draft } from './weave'

/** Splits values into numbered lines, e.g. "Ends 1–16: 1 2 3 4 …". Empty values show as "–". */
function lines(label: string, values: string[], perLine: number) {
  const out: string[] = []
  for (let i = 0; i < values.length; i += perLine) {
    const chunk = values.slice(i, i + perLine)
    const end = i + chunk.length
    out.push(`${label} ${i + 1}${end > i + 1 ? `–${end}` : ''}: ${chunk.join(' ')}`)
  }
  return out
}

/** Shaft for each end, 1-based. */
export const threadingLines = (d: Draft, perLine = 16) =>
  lines(
    'Ends',
    d.threading.map((s) => (s >= 0 ? String(s + 1) : '–')),
    perLine,
  )

/** Treadle(s) for each pick, 1-based; several treadles are joined with "+". */
export const treadlingLines = (d: Draft, perLine = 16) =>
  lines(
    'Picks',
    d.treadling.map((row) => row.flatMap((on, t) => (on ? [t + 1] : [])).join('+') || '–'),
    perLine,
  )

/** Shafts lifted on each pick, for dobby looms. */
export const liftplanLines = (d: Draft, perLine = 8) =>
  lines(
    'Picks',
    liftsPerPick(d).map((ss) => ss.map((s) => s + 1).join('+') || '–'),
    perLine,
  )

/** Tie-up as "Treadle 1: shafts 1, 2". */
export const tieupLines = (d: Draft) =>
  Array.from({ length: d.treadles }, (_, t) => {
    const ss = d.tieup.flatMap((row, s) => (row[t] ? [s + 1] : []))
    return `Treadle ${t + 1}: ${ss.length ? `shaft${ss.length > 1 ? 's' : ''} ${ss.join(', ')}` : 'not tied'}`
  })
