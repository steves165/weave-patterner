/**
 * Drafting helpers the designs share: an outline builder, the bodice (front and back), the sleeve, facings, bands
 * and simple shapes, and the pieces of a garment's sketch.
 */
import {
  add,
  arc,
  dist,
  type EdgeKind,
  lerp,
  type Pt,
  pathLength,
  polyline,
  pt,
  type Seg,
  scale,
  sub,
  toward,
} from './geometry'
import type { Figure, Measurements } from './measurements'
import type { Dart, Fabric, Guide, Piece } from './pattern'

/** Builds an outline segment by segment. */
export class Outline {
  segs: Seg[] = []
  at: Pt
  constructor(readonly start: Pt) {
    this.at = start
  }
  line(to: Pt, kind: EdgeKind = 'seam') {
    this.segs.push({ to, kind })
    this.at = to
    return this
  }
  curve(c1: Pt, c2: Pt, to: Pt, kind: EdgeKind = 'seam') {
    this.segs.push({ to, c1, c2, kind })
    this.at = to
    return this
  }
  add(segs: Seg[]) {
    this.segs.push(...segs)
    if (segs.length) this.at = segs[segs.length - 1].to
    return this
  }
}

/** A rectangle w × h with its top left at (0, 0): edges top, right, bottom, left. */
export function rect(
  w: number,
  h: number,
  kinds: [EdgeKind, EdgeKind, EdgeKind, EdgeKind] = ['seam', 'seam', 'seam', 'seam'],
): { start: Pt; segs: Seg[] } {
  const o = new Outline(pt(0, 0))
    .line(pt(w, 0), kinds[0])
    .line(pt(w, h), kinds[1])
    .line(pt(0, h), kinds[2])
    .line(pt(0, 0), kinds[3])
  return { start: o.start, segs: o.segs }
}

/** A rectangular piece: a band, strap, tie, panel or pocket. Its grain runs down it unless `across`. */
export function rectPiece(
  id: string,
  name: string,
  w: number,
  h: number,
  cut: Partial<Piece> & { kinds?: [EdgeKind, EdgeKind, EdgeKind, EdgeKind]; across?: boolean } = {},
): Piece {
  const { kinds, across, ...rest } = cut
  const { start, segs } = rect(w, h, kinds)
  const fold = kinds?.indexOf('fold') ?? -1
  return {
    id,
    name,
    start,
    segs,
    cut: 1,
    fabric: 'main',
    onFold: fold >= 0,
    grain:
      fold >= 0
        ? undefined
        : across
          ? [pt(w * 0.2, h / 2), pt(w * 0.8, h / 2)]
          : [pt(w / 2, h * 0.2), pt(w / 2, h * 0.8)],
    ...rest,
  }
}

/** A circle of radius r, centred at (r, r): a pocket, a crown. */
export function circle(r: number, kind: EdgeKind = 'seam'): { start: Pt; segs: Seg[] } {
  const c = pt(r, r)
  return { start: pt(2 * r, r), segs: arc(c, r, 0, 2 * Math.PI, kind) }
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n))

export type Neckline = 'crew' | 'scoop' | 'v' | 'boat' | 'high'

export interface BodiceSpec {
  m: Measurements
  figure: Figure
  /** Ease at the bust, all round. */
  ease: number
  /** Ease at the hips, all round. */
  hipEase: number
  /** Where the hem is, down from the back neck (the nape). */
  length: number
  neckline: Neckline
  /** Shape at the waist: straight down from the bust, or in at the waist (with darts in wovens). */
  shape: 'straight' | 'fitted' | 'aline'
  /** Knit fabric: a wider neck, no darts, a smaller armhole. */
  knit: boolean
  sleeveless: boolean
  /** Front opening down the centre front (buttons): the front is cut in two with a button stand. */
  frontOpening?: boolean
  /** A seam down the centre back (for a zip) instead of cutting the back on the fold. */
  backSeam?: boolean
  /** Extra length at the shoulder, for a dropped shoulder. */
  drop?: number
  /** Stop at the waist (a bodice for a dress, or a block), with waist darts there when fitted. */
  toWaist?: boolean
  /** No bust dart even when woven (a loose, darts-free shape). */
  noBustDart?: boolean
}

export interface Bodice {
  front: Piece
  back: Piece
  /** The armhole curves, front and back, and their lengths, for the sleeve. */
  armhole: { front: number; back: number }
  /** The neckline lengths (half, front and back) for bands and bindings. */
  neck: { front: number; back: number }
  /** Key points on the front, for the sketch and facings. */
  key: {
    hps: Pt
    sp: Pt
    ua: Pt
    hem: Pt
    waistY: number
    frontNeck: Pt
    backNeck: Pt
    backSp: Pt
    neckSegsFront: Seg[]
    neckSegsBack: Seg[]
    /** How far the front hangs below the back, to make room for the bust (taken up by the bust dart). */
    dartIntake: number
  }
  /** Width (half) at the hem. */
  hemHalf: number
}

/**
 * The bodice: half a front and half a back, centre on x = 0, the high shoulder point level at y = 0. Proportions after
 * the usual block drafts (Aldrich), simplified: the neck from the neck size, the armhole depth from the bust, the
 * shoulder from its measurement, the side seam shaped to the waist and hips.
 */
export function bodice(s: BodiceSpec): Bodice {
  const { m } = s
  const knit = s.knit
  const q = (m.bust + s.ease) / 4
  const shift = s.figure === 'bust' && !knit ? 0.5 : 0
  const qFront = q + shift
  const qBack = q - shift
  const nw = m.neck / 6 + 0.3 + (knit ? 0.7 : 0) + (s.neckline === 'boat' ? 4 : 0)
  const backNeckDepth = 2
  const frontNeckDepth = {
    crew: nw + 1.5,
    high: nw + 0.8,
    scoop: nw + 7,
    v: Math.max(nw + 10, 19),
    boat: 3,
  }[s.neckline]
  const drop = 4.2
  const shoulderLen = (s.sleeveless ? m.shoulder * 0.75 : m.shoulder) + (s.drop ?? 0)
  const spDx = Math.sqrt(Math.max(1, shoulderLen ** 2 - drop ** 2))
  const hps = pt(nw, 0)
  const spFront = pt(nw + spDx, drop + (s.drop ? s.drop * 0.25 : 0))
  const spBack = pt(nw + spDx, drop + (s.drop ? s.drop * 0.25 : 0))
  const armholeDepth = m.bust / 10 + 10.5 + (knit ? 0.3 : 1.5) + (s.sleeveless ? 1.5 : 0) + (s.drop ?? 0) * 0.4
  const waistY = backNeckDepth + m.napeToWaist
  const hipY = waistY + m.waistToHip
  const hemY = backNeckDepth + s.length
  const qWaistBody = (m.waist + (knit ? 4 : 6)) / 4
  const qHip = Math.max(q - 1, (m.hips + s.hipEase) / 4)
  // A bust dart (wovens with a bust): the front is longer by its intake, taken up at the side.
  const dartIntake =
    s.figure === 'bust' && !knit && !s.noBustDart ? clamp((m.bust - m.waist) / 8 + (m.bust - 84) / 10, 1.5, 5) : 0

  const sideFrom = (qq: number, ua: Pt) => {
    // The side seam's points below the underarm, before any bust dart.
    const pts: Pt[] = []
    const fitted = s.shape === 'fitted'
    const waistQ = fitted ? Math.max(qWaistBody + (s.toWaist ? 0 : 1), qq - 2.5) : qq
    const hipQ = Math.max(qHip, waistQ)
    if (s.toWaist) {
      pts.push(pt(fitted ? waistQ : qq, waistY))
      return { pts, hemHalf: fitted ? waistQ : qq, waistQ }
    }
    if (hemY <= waistY + 1) {
      pts.push(pt(lerpN(qq, waistQ, (hemY - ua.y) / (waistY - ua.y)), hemY))
      return { pts, hemHalf: pts[0].x, waistQ }
    }
    if (fitted) pts.push(pt(waistQ, waistY))
    const flare = s.shape === 'aline' ? 0.12 : 0.02
    if (hemY <= hipY) {
      const x = fitted ? lerpN(waistQ, hipQ, (hemY - waistY) / (hipY - waistY)) : Math.max(qq, lerpN(qq, hipQ, 1))
      pts.push(pt(x, hemY))
      return { pts, hemHalf: x, waistQ }
    }
    const hipX = s.shape === 'aline' ? Math.max(hipQ, qq + (hipY - ua.y) * 0.08) : Math.max(hipQ, qq)
    pts.push(pt(hipX, hipY))
    const hemX = hipX + (hemY - hipY) * flare
    pts.push(pt(hemX, hemY))
    return { pts, hemHalf: hemX, waistQ }
  }

  const makeHalf = (front: boolean): Piece & { _armhole: Seg[]; _neck: Seg[]; _hemHalf: number } => {
    const qq = front ? qFront : qBack
    const sp = front ? spFront : spBack
    const ua = pt(qq, armholeDepth)
    const across = front ? m.backWidth / 2 - 1 + (knit ? 0.5 : 0) : m.backWidth / 2 + (knit ? 0.5 : 0)
    const acrossX = Math.min(across, sp.x - 0.4)
    const midY = sp.y + (armholeDepth - sp.y) * 0.55
    // Down from the shoulder to the across point, then curving out to the underarm.
    const scoop = front ? 0.55 : 0.45
    const armhole: Seg[] = [
      {
        kind: 'seam',
        c1: pt(sp.x - (sp.x - acrossX) * 0.6, sp.y + (midY - sp.y) * 0.4),
        c2: pt(acrossX, midY - 3),
        to: pt(acrossX, midY),
      },
      {
        kind: 'seam',
        c1: pt(acrossX, midY + (armholeDepth - midY) * 0.5),
        c2: pt(acrossX + (ua.x - acrossX) * scoop, armholeDepth),
        to: ua,
      },
    ]
    const intake = front ? dartIntake : 0
    const side = sideFrom(qq, ua)
    const below = (p: Pt) => pt(p.x, p.y + intake)
    const sidePts = side.pts.map(below)
    const hemPt = sidePts[sidePts.length - 1]
    const hemKind: EdgeKind = s.toWaist ? 'seam' : 'hem'
    const neckDepth = front ? frontNeckDepth : backNeckDepth
    const centre = pt(0, neckDepth)
    // The neckline, from the centre to the high shoulder point.
    const neck: Seg[] =
      front && s.neckline === 'v'
        ? [{ kind: 'seam', to: hps }]
        : [
            {
              kind: 'seam',
              c1: pt(nw * (front ? 0.55 : 0.6), neckDepth),
              c2: pt(nw, neckDepth * (front ? 0.45 : 0.6)),
              to: hps,
            },
          ]
    const centreKind: EdgeKind = (front && s.frontOpening) || (!front && s.backSeam) ? 'seam' : 'fold'
    const o = new Outline(hps).line(sp).add(armhole)
    for (const p of sidePts) o.line(p)
    o.line(pt(0, hemPt.y), hemKind)
    o.line(centre, centreKind)
    o.add(neck)

    const darts: Dart[] = []
    const guides: Guide[] = []
    if (front && intake > 0) {
      // Side bust dart: from the side seam 5 cm below the underarm towards the bust point.
      const sideTop = ua
      const sideNext = sidePts[0]
      const a = toward(sideTop, below(sideNext), 5)
      const b = toward(sideTop, below(sideNext), 5 + intake * 1.05)
      // Moving `a` and `b` apart on the front's longer side seam: they're on the seam line itself.
      const bp = pt(m.bust / 10 - 0.5, armholeDepth + 3.5)
      const tip = toward(bp, lerp(a, b, 0.5), 2.5)
      darts.push({ a, b, tip })
    }
    if (s.shape === 'fitted' && !knit) {
      // Waist darts, under the bust point (front) or the shoulder blade (back).
      const sup = Math.max(0, qq - side.waistQ)
      const width = clamp((m.bust - m.waist) / (front ? 8 : 10) - sup * 0.3, 0, front ? 3.5 : 3)
      if (width >= 0.8) {
        const x = front ? m.bust / 10 - 0.5 : m.backWidth / 4 + 1.5
        const wy = waistY + intake
        const top = pt(x, front ? armholeDepth + 6 : armholeDepth - 1)
        if (s.toWaist) darts.push({ a: pt(x - width / 2, wy), b: pt(x + width / 2, wy), tip: top })
        else
          darts.push({
            a: pt(x - width / 2, wy),
            b: pt(x + width / 2, wy),
            tip: top,
            tip2: pt(x, Math.min(wy + 12, hemPt.y - 4)),
          })
      }
    }
    if (!s.toWaist && hemPt.y > waistY + 6)
      guides.push({ a: pt(1, waistY + intake), b: pt(qq - 1, waistY + intake), label: 'Waistline', kind: 'line' })
    const adjustY = s.toWaist
      ? (armholeDepth + waistY) / 2 + intake
      : Math.min(hemPt.y - 6, (hipY + hemPt.y) / 2 + intake)
    if (adjustY > armholeDepth + 4)
      guides.push({
        a: pt(1, adjustY),
        b: pt(hemPt.x - 1.5, adjustY),
        label: 'Lengthen or shorten here',
        kind: 'adjust',
      })

    const name = front ? 'Front' : 'Back'
    const onFold = centreKind === 'fold'
    const halfCut = front ? !!s.frontOpening : !!s.backSeam
    return {
      id: front ? 'front' : 'back',
      name,
      start: o.start,
      segs: o.segs,
      cut: halfCut ? 2 : 1,
      pair: halfCut,
      onFold,
      fabric: 'main',
      grain: onFold ? undefined : [pt(qq / 2, armholeDepth), pt(qq / 2, hemPt.y - 6)],
      stretch: knit,
      darts,
      guides,
      notches: [
        // Front: one notch on the armhole; back: two.
        { at: pt(acrossX, midY + (armholeDepth - midY) * 0.4), double: !front },
      ],
      labelAt: pt(qq * 0.5, s.toWaist ? armholeDepth + 4 : Math.min(hemPt.y - 10, waistY + intake + 9)),
      _armhole: armhole,
      _neck: neck,
      _hemHalf: side.hemHalf,
    }
  }

  const f = makeHalf(true)
  const b = makeHalf(false)
  const strip = ({ _armhole, _neck, _hemHalf, ...p }: typeof f): Piece => p
  return {
    front: strip(f),
    back: strip(b),
    armhole: { front: pathLength(spFront, f._armhole), back: pathLength(spBack, b._armhole) },
    neck: { front: pathLength(pt(0, frontNeckDepth), f._neck), back: pathLength(pt(0, backNeckDepth), b._neck) },
    key: {
      hps,
      sp: spFront,
      ua: pt(qFront, armholeDepth),
      hem: pt(f._hemHalf, (s.toWaist ? waistY : hemY) + dartIntake),
      waistY,
      frontNeck: pt(0, frontNeckDepth),
      backNeck: pt(0, backNeckDepth),
      backSp: spBack,
      neckSegsFront: f._neck,
      neckSegsBack: b._neck,
      dartIntake,
    },
    hemHalf: f._hemHalf,
  }
}

const lerpN = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1)

export interface SleeveSpec {
  m: Measurements
  /** Front and back armholes, measured on the bodice. */
  armhole: number
  /** Ease round the upper arm. */
  ease: number
  /** Extra length in the cap over the armhole, eased in (wovens). */
  capEase: number
  /** Length from the top of the cap. */
  length: number
  /** Width all round at the hem. */
  hem: number
  /** The hem is sewn to a cuff or band rather than hemmed. */
  hemKind?: EdgeKind
}

/** A sleeve, centred on x = 0 with the top of the cap at (0, 0): the cap height found so the cap fits the armhole. */
export function sleeve(s: SleeveSpec): Piece & { capHeight: number; bicep: number } {
  const bw = (s.m.upperArm + s.ease) / 2
  // An S-curve each side: level at the underarm and at the top.
  const capFor = (ch: number): Seg[] => [
    { kind: 'seam', c1: pt(-bw * 0.55, ch), c2: pt(-bw * 0.42, 0), to: pt(0, 0) },
    { kind: 'seam', c1: pt(bw * 0.42, 0), c2: pt(bw * 0.55, ch), to: pt(bw, ch) },
  ]
  const want = s.armhole + s.capEase
  let lo = 1
  let hi = Math.max(4, Math.min(22, s.length - 2))
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (pathLength(pt(-bw, mid), capFor(mid)) < want) lo = mid
    else hi = mid
  }
  const ch = (lo + hi) / 2
  const hw = Math.min(bw, s.hem / 2)
  const len = Math.max(ch + 3, s.length)
  const o = new Outline(pt(-bw, ch))
    .add(capFor(ch))
    .line(pt(hw, len))
    .line(pt(-hw, len), s.hemKind ?? 'hem')
    .line(pt(-bw, ch))
  const capPts = polyline(pt(-bw, ch), capFor(ch), 0.2)
  const onCap = (frac: number) => {
    // A point a fraction of the way along the cap.
    const total = pathLength(pt(-bw, ch), capFor(ch))
    let acc = 0
    for (let i = 1; i < capPts.length; i++) {
      const l = dist(capPts[i - 1], capPts[i])
      if (acc + l >= frac * total) return lerp(capPts[i - 1], capPts[i], (frac * total - acc) / l)
      acc += l
    }
    return capPts[capPts.length - 1]
  }
  const guides: Guide[] = []
  if (len - ch > 20)
    guides.push({
      a: pt(-lerpN(bw, hw, 0.55) + 1, ch + (len - ch) * 0.55),
      b: pt(lerpN(bw, hw, 0.55) - 1, ch + (len - ch) * 0.55),
      label: 'Lengthen or shorten here',
      kind: 'adjust',
    })
  return {
    id: 'sleeve',
    name: 'Sleeve',
    start: o.start,
    segs: o.segs,
    cut: 2,
    pair: true,
    fabric: 'main',
    grain: [pt(0, ch + 2), pt(0, len - 3)],
    notches: [{ at: onCap(0.25), double: true }, { at: onCap(0.75) }, { at: pt(0, 0) }],
    guides,
    labelAt: pt(-bw * 0.45, ch + (len - ch) * 0.3),
    capHeight: ch,
    bicep: bw * 2,
  }
}

/**
 * A facing for a neckline: the neckline itself, along the shoulder, and back to the centre `width` from the neckline
 * (its outer edge neatened, so no allowance). `centre` is where the neckline meets the centre; the neck segments run
 * from there to the high shoulder point.
 */
export function facing(
  id: string,
  name: string,
  centre: Pt,
  neck: Seg[],
  sp: Pt,
  width: number,
  onFold: boolean,
): Piece {
  const hps = neck[neck.length - 1].to
  const shoulderEnd = toward(hps, sp, Math.min(width, dist(hps, sp) - 0.5))
  const curve = polyline(centre, neck, 0.8)
  // The inner edge: the neckline moved `width` down into the body.
  const inner = curve.map((p, i) => {
    const a = curve[Math.max(0, i - 1)]
    const b = curve[Math.min(curve.length - 1, i + 1)]
    const dir = sub(b, a)
    const l = Math.hypot(dir.x, dir.y) || 1
    // Clockwise on screen, the body is to the right of travel from the centre to the shoulder.
    return add(p, scale(pt(-dir.y / l, dir.x / l), width))
  })
  const o = new Outline(centre).add(neck).line(shoulderEnd)
  for (const p of inner.slice(1, -1).reverse()) o.line(p, 'raw')
  o.line(pt(0, centre.y + width), 'raw').line(centre, onFold ? 'fold' : 'seam')
  return {
    id,
    name,
    start: o.start,
    segs: o.segs,
    cut: onFold ? 1 : 2,
    pair: !onFold,
    onFold,
    fabric: 'main',
    interface: true,
    grain: onFold ? undefined : [pt(hps.x * 0.5, centre.y + width * 0.2), pt(hps.x * 0.5, centre.y + width * 0.8)],
    labelAt: lerp(curve[Math.floor(curve.length / 2)], inner[Math.floor(inner.length / 2)], 0.5),
  }
}

/** A curved piece between two arcs (a circle skirt, a brim): a sector of a ring, `angle` radians, one edge on the fold. */
export function sector(
  inner: number,
  outer: number,
  angle: number,
  kinds: { inner: EdgeKind; outer: EdgeKind; start: EdgeKind; end: EdgeKind },
): { start: Pt; segs: Seg[]; centre: Pt } {
  // Centred above, so the piece hangs down: the start edge runs straight down at x = 0.
  const c = pt(0, 0)
  const a0 = Math.PI / 2
  const a1 = Math.PI / 2 - angle
  const at = (r: number, a: number) => pt(r * Math.cos(a), r * Math.sin(a))
  const o = new Outline(at(inner, a1))
  // Clockwise on screen: the inner arc back to the start edge, down it, round the outer arc, and up the end edge.
  o.add(arc(c, inner, a1, a0, kinds.inner).map((x) => x))
  o.line(at(outer, a0), kinds.start)
  o.add(arc(c, outer, a0, a1, kinds.outer))
  o.line(at(inner, a1), kinds.end)
  return { start: o.start, segs: o.segs, centre: c }
}

/** Points of a polygon outline mirrored about x = 0 and joined: the whole front from half of it. */
export function mirrorWhole(half: Pt[]): Pt[] {
  return [
    ...half,
    ...half
      .slice()
      .reverse()
      .map((p) => pt(-p.x, p.y)),
  ]
}

/** The sewing line of a piece as points, for sketches. */
export const sewLine = (p: Piece) => polyline(p.start, p.segs, 0.6)

/** The points of a piece's sewing line on its right of the centre (x ≥ 0), in order round from the top. */
export function halfOutline(p: Piece): Pt[] {
  return sewLine(p).filter((q) => q.x >= -0.01)
}

/** A line in a sketch along a set of points. */
export const sketchLine = (pts: Pt[], dash = false) => ({ pts, dash })

/** A rotated rectangle in a sketch: a sleeve from (a) with width w at the top, w2 at the bottom, length l, angle. */
export function limb(top: Pt, w: number, w2: number, l: number, angle: number): Pt[] {
  const d = pt(Math.cos(angle), Math.sin(angle))
  const n = pt(-d.y, d.x)
  const end = add(top, scale(d, l))
  return [
    add(top, scale(n, -w / 2)),
    add(top, scale(n, w / 2)),
    add(end, scale(n, w2 / 2)),
    add(end, scale(n, -w2 / 2)),
  ]
}

export type { Fabric }
export { clamp, lerpN }
