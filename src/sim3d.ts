import { isLayered, layerMap } from './layers'
import { computeDrawdown, type Draft } from './weave'
import type { ClothLook } from './yarnGeometry'

/** Thread spacing is 1 unit. These set how threads bend round each other, as fractions of that spacing. */
export const THREAD = {
  /** How far a thread rises above or dips below the middle of its layer where it crosses another, per unit of size. */
  bend: 0.28,
  /** How far below the upper layer the lower layer of double cloth lies. */
  layerGap: 0.9,
}

export type Point = [number, number, number]

/** The centre line of one thread through the cloth: x across the warp, y down the picks, z out of the face. */
export interface ThreadPath {
  kind: 'warp' | 'weft'
  /** 0-based end or pick. */
  index: number
  color: string
  /** Radius of the thread, relative to the spacing between ends (before any thickness setting). */
  radius: number
  points: Point[]
}

export interface FabricModel {
  paths: ThreadPath[]
  /** Ends and picks shown, from end 1 and pick 1. */
  ends: number
  picks: number
  layered: boolean
}

/**
 * Builds the path of every thread in the first `ends` × `picks` of the draft, for a 3D preview. At each crossing the
 * thread on top rises by `bend` and the one underneath dips by the same amount; in double cloth, threads of the
 * lower layer sit `layerGap` further back. Unthreaded ends and picks with nothing lifted are left out, as they
 * wouldn't be in the cloth. Each path runs half a thread past the edge so the cloth has a tidy border.
 *
 * `look` sets each thread's size and the spacing of picks (from yarns and sett); without it every thread is the
 * same size and picks are as far apart as ends. Thicker threads bend further round each other.
 */
export function fabricModel(
  d: Draft,
  ends = d.ends,
  picks = d.picks,
  drawdown = computeDrawdown(d),
  look?: ClothLook,
): FabricModel {
  const shownEnds = Math.min(ends, d.ends)
  const shownPicks = Math.min(picks, d.picks)
  const face = layerMap(d, 'face', drawdown)
  const layered = isLayered(face, layerMap(d, 'back', drawdown))
  const { layerGap } = THREAD
  const warpSize = (e: number) => look?.warpSize[e] ?? 1
  const weftSize = (p: number) => look?.weftSize[p] ?? 1
  const bend = (p: number, e: number) => (THREAD.bend * (warpSize(e) + weftSize(p))) / 2
  const depth = (lower: boolean) => (layered && lower ? -layerGap : 0)
  // Where end e crosses pick p: the end's height and the pick's height.
  const warpZ = (p: number, e: number) => depth(face.lowerEnd[p][e]) + (drawdown[p][e] ? 1 : -1) * bend(p, e)
  const weftZ = (p: number, e: number) => depth(face.lowerPick[p][e]) + (drawdown[p][e] ? -1 : 1) * bend(p, e)

  const endsIn = Array.from({ length: shownEnds }, (_, e) => e).filter((e) => d.threading[e] >= 0)
  const picksIn = Array.from({ length: shownPicks }, (_, p) => p).filter((p) => d.treadling[p].some(Boolean))
  const x = (e: number) => e - (shownEnds - 1) / 2
  const gap = look?.pickSpacing ?? 1
  const y = (p: number) => ((shownPicks - 1) / 2 - p) * gap
  const extend = (pts: Point[], dx: number, dy: number): Point[] => {
    const [first, last] = [pts[0], pts[pts.length - 1]]
    return [[first[0] - dx, first[1] - dy, first[2]], ...pts, [last[0] + dx, last[1] + dy, last[2]]]
  }

  const paths: ThreadPath[] = []
  if (picksIn.length > 0)
    for (const e of endsIn)
      paths.push({
        kind: 'warp',
        index: e,
        color: d.warpColors[e],
        radius: warpSize(e) / 2,
        points: extend(
          picksIn.map((p) => [x(e), y(p), warpZ(p, e)]),
          0,
          -gap / 2,
        ),
      })
  if (endsIn.length > 0)
    for (const p of picksIn)
      paths.push({
        kind: 'weft',
        index: p,
        color: d.weftColors[p],
        radius: weftSize(p) / 2,
        points: extend(
          endsIn.map((e) => [x(e), y(p), weftZ(p, e)]),
          0.5,
          0,
        ),
      })
  return { paths, ends: shownEnds, picks: shownPicks, layered }
}
