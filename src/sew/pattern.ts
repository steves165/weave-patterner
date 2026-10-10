import { add, bounds, type EdgeKind, offsetOutline, type Pt, polyline, type Seg } from './geometry'
import type { Figure, MeasurementId, Measurements } from './measurements'

/** The fabric a piece is cut from. */
export type Fabric = 'main' | 'contrast' | 'lining' | 'interfacing'
export const FABRIC_NAMES: Record<Fabric, string> = {
  main: 'Main fabric',
  contrast: 'Contrast fabric',
  lining: 'Lining',
  interfacing: 'Interfacing',
}

/** A dart: its two legs where it meets the sewing line, and its point; a second point for a double-pointed dart. */
export interface Dart {
  a: Pt
  b: Pt
  tip: Pt
  tip2?: Pt
}

/** A line drawn on a piece: a lengthen or shorten line, the waistline, a fold line for a facing. */
export interface Guide {
  a: Pt
  b: Pt
  label: string
  kind: 'adjust' | 'line'
}

/** A mark on a piece: a dot to match, a button, a buttonhole (from `at` to `to`), a pocket position. */
export interface Mark {
  kind: 'dot' | 'button' | 'buttonhole'
  at: Pt
  to?: Pt
}

/** A pattern piece: its sewing line and markings, and how to cut it. */
export interface Piece {
  id: string
  name: string
  /** Where the outline starts; it runs clockwise through `segs` back to here. */
  start: Pt
  segs: Seg[]
  /** How many to cut. With `pair`, they're mirror images (a left and a right). */
  cut: number
  pair?: boolean
  /** Cut on the fold: the edge marked 'fold' goes on the folded edge of the fabric. */
  onFold?: boolean
  fabric: Fabric
  /** Also cut from interfacing. */
  interface?: boolean
  /** The grainline, which runs along the length of the fabric. Pieces on the fold use the fold. */
  grain?: [Pt, Pt]
  /** The grain shows the stretch, across the piece (knits): the greatest stretch runs along the arrow. */
  stretch?: boolean
  /** No grain to keep to (circles and the like): it can be turned any way on the fabric. */
  freeGrain?: boolean
  /** Cut on the bias (the grainline at 45°). */
  bias?: boolean
  darts?: Dart[]
  /** Notches on the sewing line: points to match when sewing; `double` for backs. */
  notches?: { at: Pt; double?: boolean }[]
  marks?: Mark[]
  guides?: Guide[]
  /** Where to put the name and cutting note: the middle of the piece unless given. */
  labelAt?: Pt
}

/** A choice of style, fit or size in a design. */
export type Option =
  | {
      id: string
      label: string
      type: 'choice'
      choices: { value: string; label: string }[]
      default: string
      when?: (o: Options) => boolean
    }
  | {
      id: string
      label: string
      type: 'number'
      /** In cm for lengths (shown in the chosen units), or a plain number. */
      unit: 'cm' | '%' | ''
      min: number
      max: number
      step: number
      default: number
      help?: string
      when?: (o: Options) => boolean
    }
  | { id: string; label: string; type: 'bool'; default: boolean; help?: string; when?: (o: Options) => boolean }

export type Options = Record<string, string | number | boolean>

export interface Body {
  m: Measurements
  figure: Figure
}

/** A garment or project: what it is, what it needs, and how to draft, sew and draw it. */
export interface Design {
  id: string
  name: string
  category: 'Tops' | 'Dresses' | 'Skirts' | 'Trousers' | 'Accessories' | 'Blocks'
  about: string
  level: 'Beginner' | 'Confident beginner' | 'Intermediate'
  /** Suggested fabrics. */
  fabrics: string
  /** A knit design (stretch fabric), so the grainline shows the stretch. */
  knit?: boolean
  /** Its usual allowances, when they differ from 1.5 cm seams and 3 cm hems. */
  allowances?: Partial<Allowances>
  /** The measurements it uses (none for bags and cushions). */
  measurements: MeasurementId[]
  options: Option[]
  draft(body: Body, o: Options): Piece[]
  /** Notions and other things to buy, besides the fabric. */
  materials(body: Body, o: Options): string[]
  /** How to sew it, step by step. */
  steps(o: Options): string[]
  /** A front view of the garment, as outlines (cm, y down) and lines of stitching. */
  sketch(body: Body, o: Options): Sketch
}

/** A flat drawing: filled shapes, then lines over them (seams, hems, stitching), and dots (buttons). */
export interface Sketch {
  shapes: { pts: Pt[]; fill?: 'main' | 'contrast' | 'lining' }[]
  lines: { pts: Pt[]; dash?: boolean }[]
  dots?: Pt[]
}

export const defaultOptions = (d: Design): Options => Object.fromEntries(d.options.map((o) => [o.id, o.default]))

/** Options for a design, each one checked against the design's choices and limits. */
export function cleanOptions(d: Design, o: unknown): Options {
  const out = defaultOptions(d)
  if (!o || typeof o !== 'object') return out
  const given = o as Record<string, unknown>
  for (const opt of d.options) {
    const v = given[opt.id]
    if (opt.type === 'choice' && typeof v === 'string' && opt.choices.some((c) => c.value === v)) out[opt.id] = v
    else if (opt.type === 'number' && typeof v === 'number' && Number.isFinite(v))
      out[opt.id] = Math.max(opt.min, Math.min(opt.max, v))
    else if (opt.type === 'bool' && typeof v === 'boolean') out[opt.id] = v
  }
  return out
}

/** How much to add outside the sewing line, by edge. */
export interface Allowances {
  /** Whether to add allowances at all (off for patterns traced and added by hand). */
  include: boolean
  seam: number
  hem: number
}
export const DEFAULT_ALLOWANCES: Allowances = { include: true, seam: 1.5, hem: 3 }

export const allowanceFor = (a: Allowances) => (kind: EdgeKind) =>
  !a.include || kind === 'fold' || kind === 'raw' ? 0 : kind === 'hem' ? a.hem : a.seam

/** A piece's sewing line and cutting line, as points. */
export function outlines(p: Piece, a: Allowances): { sew: Pt[]; cut: Pt[] } {
  const sew = polyline(p.start, p.segs, 0.4)
  sew.pop() // back at the start
  return { sew, cut: a.include ? offsetOutline(p.start, p.segs, allowanceFor(a)) : sew }
}

/** What to cut, in words: "Cut 2 (a pair)", "Cut 1 on the fold". */
export function cutNote(p: Piece): string {
  const n = p.cut
  const fold = p.onFold ? ' on the fold' : ''
  const pair = p.pair && n === 2 ? ' (a pair)' : p.pair ? ` (${n / 2} pairs)` : ''
  return `Cut ${n}${fold}${pair}`
}

/** A piece moved by (dx, dy), markings and all. */
export function movePiece(p: Piece, dx: number, dy: number): Piece {
  const d = { x: dx, y: dy }
  const m = (q: Pt) => add(q, d)
  return transformPiece(p, m)
}

/** A piece with every point passed through f. */
export function transformPiece(p: Piece, f: (q: Pt) => Pt): Piece {
  return {
    ...p,
    start: f(p.start),
    segs: p.segs.map((s) => ({ ...s, to: f(s.to), ...(s.c1 && s.c2 ? { c1: f(s.c1), c2: f(s.c2) } : {}) })),
    grain: p.grain && [f(p.grain[0]), f(p.grain[1])],
    darts: p.darts?.map((d) => ({ a: f(d.a), b: f(d.b), tip: f(d.tip), ...(d.tip2 ? { tip2: f(d.tip2) } : {}) })),
    notches: p.notches?.map((n) => ({ ...n, at: f(n.at) })),
    marks: p.marks?.map((m) => ({ ...m, at: f(m.at), ...(m.to ? { to: f(m.to) } : {}) })),
    guides: p.guides?.map((g) => ({ ...g, a: f(g.a), b: f(g.b) })),
    labelAt: p.labelAt && f(p.labelAt),
  }
}

/** The box around a piece's cutting line. */
export const pieceBounds = (p: Piece, a: Allowances) => bounds(outlines(p, a).cut)
