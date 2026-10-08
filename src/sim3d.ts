import { isLayered, layerMap } from './layers'
import type { Texture } from './textures'
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
  texture: Texture
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
        texture: look?.warpTexture[e] ?? 'smooth',
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
        texture: look?.weftTexture[p] ?? 'smooth',
        points: extend(
          endsIn.map((e) => [x(e), y(p), weftZ(p, e)]),
          0.5,
          0,
        ),
      })
  return { paths, ends: shownEnds, picks: shownPicks, layered }
}

/** How the cloth is shown: flat, or made up into something. */
export type ClothShape = 'flat' | 'draped' | 'cushion' | 'rolled'

/**
 * Moves a point of the flat cloth (x across, y along, z out of the face; the cloth spans ±halfW by ±halfH) to where
 * it lies when the cloth is draped like a scarf, puffed like a cushion, or rolled up from the bottom like a towel.
 */
export function shapePoint(shape: ClothShape, [x, y, z]: Point, halfW: number, halfH: number): Point {
  switch (shape) {
    case 'flat':
      return [x, y, z]
    case 'draped': {
      // Soft folds along the cloth, as it hangs, with a gentle curve across.
      const folds = 0.12 * halfH * Math.sin((Math.PI * 1.5 * y) / halfH)
      const across = -0.08 * halfW * (x / halfW) ** 2
      return [x, y, z + folds + across]
    }
    case 'cushion': {
      // Puffed up in the middle, flat at the edges.
      const u = 1 - (x / halfW) ** 2
      const v = 1 - (y / halfH) ** 2
      return [x, y, z + 0.5 * Math.min(halfW, halfH) * Math.max(0, u * v)]
    }
    case 'rolled': {
      // The lower part of the cloth rolled up towards the face round a bar.
      const start = -0.2 * halfH
      if (y >= start) return [x, y, z]
      // Sized so the rolled part goes round a little less than once, rather than winding over itself.
      const radius = Math.max(1.2, (start + halfH) / (1.7 * Math.PI))
      const r = radius + z
      const angle = (start - y) / radius
      return [x, start - r * Math.sin(angle), radius - r * Math.cos(angle)]
    }
  }
}

/**
 * The open shed for one pick of the weaving animation: warp ends parting below the fell (the cloth grows downwards
 * here, pick 1 at the top), and the shuttle's path.
 */
export interface Shed {
  /** Where the newest pick lies. */
  fellY: number
  /** Each warp end from the fell back towards the loom, raised or lowered by how far the shed is open. */
  lines: { from: Point; to: Point; color: string }[]
  /** Where the shuttle runs: across the shed, just behind the fell. */
  shuttle: { y: number; z: number; fromX: number; toX: number }
}

/** How far behind the fell the shed is drawn, and how far it opens up and down. */
export const SHED = { depth: 7, open: 1.6 }

/**
 * The shed for weaving pick `pick` (0-based, as in the draft): ends that lift for it rise behind the fell, the
 * rest drop, `opening` of the way (0–1). The shuttle crosses from the left on even-numbered picks of the order
 * and from the right on odd ones, as it goes back and forth.
 */
export function shedFor(model: FabricModel, drawdown: boolean[][], pick: number, order: number, opening: number): Shed {
  const weft = model.paths.find((p) => p.kind === 'weft' && p.index === pick)
  const y = weft ? weft.points[1][1] : 0
  const warps = model.paths.filter((p) => p.kind === 'warp')
  const lines = warps.map((w) => {
    const x = w.points[1][0]
    const lift = drawdown[pick]?.[w.index] ? 1 : -1
    return {
      from: [x, y, 0] as Point,
      to: [x, y - SHED.depth, lift * SHED.open * opening] as Point,
      color: w.color,
    }
  })
  const xs = warps.map((w) => w.points[1][0])
  const [left, right] = [Math.min(...xs, 0) - 3, Math.max(...xs, 0) + 3]
  const fromLeft = order % 2 === 0
  return {
    fellY: y,
    lines,
    shuttle: { y: y - 1.2, z: 0, fromX: fromLeft ? left : right, toX: fromLeft ? right : left },
  }
}
