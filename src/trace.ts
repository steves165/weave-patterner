import type { LayerMap } from './layers'
import { isDirectTieup } from './liftplan'
import type { Draft } from './weave'

/** Why one drawdown square shows warp or weft: the threading, treadling and tie-up cells behind it. */
export interface Trace {
  end: number
  pick: number
  /** Shaft the end is threaded on, or -1 if unthreaded. */
  shaft: number
  /** Treadles pressed (or, for a lift plan, shafts lifted) on the pick. */
  treadles: number[]
  /** The pressed treadles that lift the end's shaft. */
  lifting: number[]
  warpUp: boolean
  /** A sentence explaining the result. */
  explanation: string
}

const list = (n: number[]) => (n.length <= 1 ? String(n[0]) : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`)

export function traceCell(d: Draft, end: number, pick: number): Trace {
  const shaft = d.threading[end] ?? -1
  const treadles = d.treadling[pick].flatMap((on, t) => (on ? [t] : []))
  const lifting = shaft < 0 ? [] : treadles.filter((t) => d.tieup[shaft][t])
  const warpUp = lifting.length > 0
  const at = `End ${end + 1}, pick ${pick + 1}`
  const s = shaft + 1
  const one = (n: number[]) => list(n.map((t) => t + 1))
  let explanation: string
  if (shaft < 0) explanation = `${at}: weft shows because end ${end + 1} isn't threaded on any shaft.`
  else if (treadles.length === 0)
    explanation = `${at}: weft shows because pick ${pick + 1} has no ${isDirectTieup(d) ? 'shafts lifted' : 'treadle pressed'}.`
  else if (isDirectTieup(d))
    explanation = warpUp
      ? `${at}: warp shows because end ${end + 1} is on shaft ${s}, which is lifted on this pick.`
      : `${at}: weft shows because end ${end + 1} is on shaft ${s}, which isn't lifted on this pick (shaft${treadles.length > 1 ? 's' : ''} ${one(treadles)} ${treadles.length > 1 ? 'are' : 'is'}).`
  else if (warpUp)
    explanation = `${at}: warp shows because end ${end + 1} is on shaft ${s}, and treadle${lifting.length > 1 ? 's' : ''} ${one(lifting)} ${lifting.length > 1 ? 'lift' : 'lifts'} it.`
  else
    explanation = `${at}: weft shows because end ${end + 1} is on shaft ${s}, and treadle${treadles.length > 1 ? 's' : ''} ${one(treadles)} ${treadles.length > 1 ? "don't" : "doesn't"} lift it.`
  return { end, pick, shaft, treadles, lifting, warpUp, explanation }
}

/** For layered cloth (double cloth), a note on which side a crossing is hidden, or null if it shows on both. */
export function layerNote(layers: { face: LayerMap; back: LayerMap }, end: number, pick: number): string | null {
  if (layers.face.hidden[pick][end])
    return `End ${end + 1} and pick ${pick + 1} are both in the lower layer here, so this crossing is hidden on the face.`
  if (layers.back.hidden[pick][end])
    return `End ${end + 1} and pick ${pick + 1} are both in the upper layer here, so this crossing is hidden on the back.`
  return null
}
