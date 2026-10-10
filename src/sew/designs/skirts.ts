import { clamp, Outline, rectPiece, sector } from '../draft'
import { type Pt, polyline, pt } from '../geometry'
import type { Body, Dart, Design, Options, Piece, Sketch } from '../pattern'
import { LENGTH_ADJUST, num, pocketBag, pocketNotches, str } from './common'

const SKIRT_LENGTH = (dflt: string) => ({
  id: 'length',
  label: 'Length',
  type: 'choice' as const,
  default: dflt,
  choices: [
    { value: 'mini', label: 'Mini' },
    { value: 'above', label: 'Above the knee' },
    { value: 'knee', label: 'Knee' },
    { value: 'midi', label: 'Midi' },
    { value: 'maxi', label: 'Maxi' },
  ],
})

/** A skirt's length from the waist. */
function skirtLength(m: Body['m'], choice: string, adjust: number): number {
  const knee = m.waistToKnee
  return (
    ((
      { mini: m.waistToHip + 18, above: knee - 8, knee, midi: knee + 18, maxi: m.waistToFloor - 4 } as Record<
        string,
        number
      >
    )[choice] ?? knee) + adjust
  )
}

/** A waistband: twice its height, folded along the middle, with an overlap for the fastening. */
const waistband = (length: number, height = 3.5): Piece =>
  rectPiece('waistband', 'Waistband', length, height * 2, {
    cut: 1,
    interface: true,
    across: true,
    guides: [{ a: pt(0.5, height), b: pt(length - 0.5, height), label: 'Fold', kind: 'line' }],
    notches: [{ at: pt(length - 3, 0) }],
  })

interface SkirtHalf {
  piece: Piece
  waist: number
  hem: number
}

/**
 * Half a fitted skirt, front or back, centre at x = 0, waist at y = 0. The difference between the hips and the waist
 * is taken in at the side seam and in darts; the side then runs straight, in to a pencil or out to an A-line.
 */
function skirtHalf(body: Body, o: Options, front: boolean): SkirtHalf {
  const { m } = body
  const shift = front ? 0.5 : -0.5
  const hq = (m.hips + 4) / 4 + shift
  const wq = (m.waist + 1) / 4 + shift
  const hipY = m.waistToHip
  const len = skirtLength(m, str(o, 'length'), num(o, 'lengthAdjust'))
  const sil = str(o, 'silhouette')
  const supp = Math.max(0, hq - wq)
  const side = Math.min(supp * 0.45, 2.5)
  const dartTotal = supp - side
  const darts: Dart[] = []
  const count = front ? 1 : dartTotal > 3.5 ? 2 : 1
  const each = count ? dartTotal / count : 0
  const sideWaist = wq + dartTotal
  if (each > 0.6)
    for (let i = 0; i < count; i++) {
      const x = front ? hq * 0.38 + i * 4 : hq * (count === 2 ? 0.33 + i * 0.27 : 0.45)
      const length = front ? 9 : 13 - i * 2
      darts.push({ a: pt(x - each / 2, 0.1), b: pt(x + each / 2, 0.1), tip: pt(x, length) })
    }
  const hemX = sil === 'pencil' ? hq - 2.5 : sil === 'aline' ? hq + (len - hipY) * 0.2 : hq
  const centreKind = front ? 'fold' : 'seam'
  const o2 = new Outline(pt(0, 0))
    .curve(pt(sideWaist * 0.5, 0), pt(sideWaist * 0.85, -0.2), pt(sideWaist, -0.8))
    .curve(pt(sideWaist + (hq - sideWaist) * 0.7, hipY * 0.25), pt(hq, hipY * 0.55), pt(hq, hipY))
    .line(pt(hemX, len))
    .line(pt(0, len), 'hem')
    .line(pt(0, 0), centreKind)
  const guides = [
    { a: pt(1, hipY), b: pt(hq - 1, hipY), label: 'Hipline', kind: 'line' as const },
    ...(len - hipY > 25
      ? [
          {
            a: pt(1, (hipY + len) / 2 + 5),
            b: pt(hq - 1, (hipY + len) / 2 + 5),
            label: 'Lengthen or shorten here',
            kind: 'adjust' as const,
          },
        ]
      : []),
  ]
  const marks = !front && sil === 'pencil' && len > hipY + 30 ? [{ kind: 'dot' as const, at: pt(0, len - 18) }] : []
  return {
    piece: {
      id: front ? 'front' : 'back',
      name: front ? 'Front' : 'Back',
      start: o2.start,
      segs: o2.segs,
      cut: front ? 1 : 2,
      pair: !front,
      onFold: front,
      fabric: 'main',
      grain: front ? undefined : [pt(hq / 2, hipY), pt(hq / 2, len - 8)],
      darts,
      guides,
      marks,
      notches: front ? [{ at: pt(hq, hipY) }] : [{ at: pt(hq, hipY), double: true }, { at: pt(0, 20) }],
      labelAt: pt(hq * 0.45, (hipY + len) / 2),
    },
    waist: sideWaist,
    hem: hemX,
  }
}

const skirtSketch = (f: Piece, band: number, gathers = false): Sketch => {
  const pts = polyline(f.start, f.segs.slice(0, 3), 0.6)
  const whole = [
    ...pts.map((p) => pt(p.x, p.y)),
    ...pts
      .slice()
      .reverse()
      .map((p) => pt(-p.x, p.y)),
  ]
  const w = Math.max(...pts.filter((p) => p.y < 1).map((p) => p.x))
  const s: Sketch = {
    shapes: [{ pts: whole }, { pts: [pt(-w, -band - 0.8), pt(w, -band - 0.8), pt(w, -0.8), pt(-w, -0.8)] }],
    lines: [],
  }
  const hem = pts[pts.length - 1]
  s.lines.push({ pts: [pt(-hem.x + 0.3, hem.y - 2.5), pt(hem.x - 0.3, hem.y - 2.5)], dash: true })
  for (const d of f.darts ?? [])
    for (const k of [1, -1]) s.lines.push({ pts: [pt((k * (d.a.x + d.b.x)) / 2, 0), pt(k * d.tip.x, d.tip.y)] })
  if (gathers) for (let x = -w + 2; x < w - 1; x += 3) s.lines.push({ pts: [pt(x, 0), pt(x * 1.25, 5)] })
  return s
}

export const SKIRT: Design = {
  id: 'skirt',
  name: 'Fitted skirt',
  category: 'Skirts',
  about: 'A darted skirt with a waistband and a back zip: pencil, straight or A-line, mini to maxi.',
  level: 'Confident beginner',
  fabrics: 'Cotton drill, denim, linen, wool suiting, ponte, corduroy.',
  measurements: ['waist', 'hips', 'waistToHip', 'waistToKnee', 'waistToFloor'],
  options: [
    {
      id: 'silhouette',
      label: 'Shape',
      type: 'choice',
      default: 'aline',
      choices: [
        { value: 'pencil', label: 'Pencil' },
        { value: 'straight', label: 'Straight' },
        { value: 'aline', label: 'A-line' },
      ],
    },
    SKIRT_LENGTH('knee'),
    LENGTH_ADJUST,
  ],
  draft(body, o) {
    const f = skirtHalf(body, o, true)
    const b = skirtHalf(body, o, false)
    return [f.piece, b.piece, waistband(body.m.waist + 1 + 3)]
  },
  materials: (body) => [
    'Thread to match',
    `A zip, ${clamp(Math.round(body.m.waistToHip / 2.5) * 2.5 - 2, 15, 23)} cm (an invisible or a regular dress zip)`,
    'A button or a hook and bar for the waistband',
    'Fusible interfacing for the waistband',
  ],
  steps(o) {
    const pencil = str(o, 'silhouette') === 'pencil'
    return [
      'Neaten the side and centre back edges with a zigzag or overlocker.',
      'Sew the darts in the front and back, tapering to nothing at the points. Press them towards the centre.',
      `Put the zip in at the top of the centre back seam, then sew the rest of the seam below it${pencil ? ', stopping at the dot to leave a walking slit; press the slit’s allowances back and topstitch them' : ''}.`,
      'Sew the side seams, matching the hip notches. Press them open.',
      'Fuse interfacing to the waistband. Sew one long edge to the skirt’s waist, right sides together, with the overlap at the zip’s underlap. Fold the band along its middle, right sides together, and sew across the ends; turn it out, fold under the other edge and stitch it down from the right side.',
      'Make a buttonhole and sew on a button (or a hook and bar) at the waistband’s overlap.',
      'Press up the hem, turn under the raw edge and stitch it by hand or machine. Press the skirt.',
    ]
  },
  sketch(body, o) {
    return skirtSketch(skirtHalf(body, o, true).piece, 3.5)
  },
}

/** A circle skirt's pieces: each a sector, cut twice on the fold (front and back). */
function circleParts(body: Body, o: Options) {
  const f = { full: 1, threeQuarter: 0.75, half: 0.5, quarter: 0.25 }[str(o, 'fullness')] ?? 1
  // The waist edge is cut on the bias in places and stretches: a little smaller than the waist.
  const r = Math.max(4, (body.m.waist - 2) / (2 * Math.PI * f))
  const len = skirtLength(body.m, str(o, 'length'), num(o, 'lengthAdjust'))
  return { f, r, len, angle: (Math.PI * f) / 2 }
}

export const CIRCLE_SKIRT: Design = {
  id: 'circle-skirt',
  name: 'Circle skirt',
  category: 'Skirts',
  about: 'A swishy skirt cut as a circle (or a half or quarter) with a waistband and a side zip.',
  level: 'Beginner',
  fabrics: 'Cotton lawn, chambray, crepe, viscose, light wool, scuba. Soft fabrics drape; crisp ones stand out.',
  allowances: { seam: 1.5, hem: 1 },
  measurements: ['waist', 'waistToHip', 'waistToKnee', 'waistToFloor'],
  options: [
    {
      id: 'fullness',
      label: 'Fullness',
      type: 'choice',
      default: 'full',
      choices: [
        { value: 'full', label: 'Full circle' },
        { value: 'threeQuarter', label: 'Three-quarter' },
        { value: 'half', label: 'Half circle' },
        { value: 'quarter', label: 'Quarter circle' },
      ],
    },
    SKIRT_LENGTH('knee'),
    LENGTH_ADJUST,
  ],
  draft(body, o) {
    const { r, len, angle } = circleParts(body, o)
    const s = sector(r, r + len, angle, { inner: 'seam', outer: 'hem', start: 'fold', end: 'seam' })
    const mid = (a: number) => pt(Math.cos(Math.PI / 2 - angle / 2) * a, Math.sin(Math.PI / 2 - angle / 2) * a)
    return [
      {
        id: 'skirt',
        name: 'Skirt (front and back)',
        start: s.start,
        segs: s.segs,
        cut: 2,
        onFold: true,
        freeGrain: true,
        fabric: 'main',
        guides: [],
        notches: [],
        labelAt: mid(r + len * 0.45),
      },
      waistband(body.m.waist + 1 + 3),
    ]
  },
  materials: () => [
    'Thread to match',
    'An invisible zip, 18 to 20 cm',
    'A hook and eye or a button for the waistband',
    'Fusible interfacing for the waistband',
  ],
  steps: () => [
    'Stay-stitch the waist of each piece just inside the sewing line, so the bias doesn’t stretch.',
    'Neaten the side edges. Sew the zip into the top of one side seam, then sew the rest of that seam and the other side seam. Press them open.',
    'Fuse interfacing to the waistband, and sew it to the waist as for any waistband: one edge to the skirt, fold, close the ends and stitch the inside down.',
    'Hang the skirt for a day so the bias drops, then level the hem from the floor and trim it.',
    'Hem with a narrow double-turned hem or a rolled hem. Press.',
  ],
  sketch(body, o) {
    const { f, len } = circleParts(body, o)
    const w = body.m.waist / 4 + 1
    const flare = w + len * (0.25 + f * 0.75)
    const hem: Pt[] = []
    const waves = 4 + Math.round(f * 6)
    for (let i = 0; i <= waves * 6; i++) {
      const t = i / (waves * 6)
      hem.push(pt(flare - 2 * flare * t, len + Math.sin(t * waves * 2 * Math.PI) * 1.2 * f))
    }
    const s: Sketch = {
      shapes: [{ pts: [pt(-w, 0), pt(w, 0), ...hem] }, { pts: [pt(-w, -3.5), pt(w, -3.5), pt(w, 0), pt(-w, 0)] }],
      lines: [],
    }
    for (let i = 1; i < waves; i++) {
      const x = -flare + (2 * flare * i) / waves
      s.lines.push({ pts: [pt(x * (w / flare) * 0.8, 2), pt(x, len - 1)] })
    }
    return s
  },
}

/** Gathered skirt: rectangles, one or more tiers, each fuller than the one above. */
function tiers(body: Body, o: Options) {
  const n = Number(str(o, 'tiers'))
  const len = skirtLength(body.m, str(o, 'length'), num(o, 'lengthAdjust'))
  const elastic = str(o, 'waist') === 'elastic'
  // Elastic waists go over the hips; a waistband with a zip only needs the waist.
  const base = (elastic ? body.m.hips + 8 : body.m.waist + 2) * num(o, 'fullness')
  const heights = Array.from({ length: n }, (_, i) => (len / n) * (n === 1 ? 1 : i === 0 ? 0.85 : 1 + 0.15 / (n - 1)))
  return heights.map((h, i) => ({ h, around: base * 1.4 ** i }))
}

export const GATHERED_SKIRT: Design = {
  id: 'gathered-skirt',
  name: 'Gathered skirt',
  category: 'Skirts',
  about: 'A dirndl skirt from rectangles: one, two or three tiers, an elastic waist or a waistband, and pockets.',
  level: 'Beginner',
  fabrics: 'Cotton lawn, poplin, seersucker, voile, linen, viscose, double gauze.',
  measurements: ['waist', 'hips', 'waistToHip', 'waistToKnee', 'waistToFloor'],
  options: [
    {
      id: 'waist',
      label: 'Waist',
      type: 'choice',
      default: 'elastic',
      choices: [
        { value: 'elastic', label: 'Elastic' },
        { value: 'band', label: 'Waistband and zip' },
      ],
    },
    {
      id: 'tiers',
      label: 'Tiers',
      type: 'choice',
      default: '1',
      choices: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' },
      ],
    },
    {
      id: 'fullness',
      label: 'Fullness',
      type: 'number',
      unit: '',
      min: 1.2,
      max: 3,
      step: 0.1,
      default: 1.6,
      help: 'How many times the waist (or, with elastic, the hips) the skirt goes round before it’s gathered.',
    },
    SKIRT_LENGTH('midi'),
    { id: 'pockets', label: 'Pockets in the side seams', type: 'bool', default: true },
    LENGTH_ADJUST,
  ],
  draft(body, o) {
    const ts = tiers(body, o)
    const elastic = str(o, 'waist') === 'elastic'
    const pieces: Piece[] = ts.map(({ h, around }, i) => {
      // Two panels per tier (front and back); widest tiers in more panels, each up to 140 cm.
      const panels = Math.max(2, Math.ceil(around / 140 / 2) * 2)
      const w = around / panels
      const name = ts.length === 1 ? 'Skirt panel' : `Tier ${i + 1}`
      const last = i === ts.length - 1
      return rectPiece(`tier-${i + 1}`, name, w, h, {
        cut: panels,
        kinds: ['seam', 'seam', last ? 'hem' : 'seam', 'seam'],
        ...(i === 0 && o.pockets
          ? { notches: [{ at: pt(w, 3) }, { at: pt(w, 18) }, { at: pt(0, 3) }, { at: pt(0, 18) }] }
          : {}),
      })
    })
    if (elastic) {
      const top = ts[0].around
      pieces.push(
        rectPiece('casing', 'Waist casing', Math.min(top, body.m.hips + 10) + 0, 9, {
          cut: 1,
          across: true,
          guides: [{ a: pt(0.5, 4.5), b: pt(Math.min(top, body.m.hips + 10) - 0.5, 4.5), label: 'Fold', kind: 'line' }],
        }),
      )
    } else pieces.push(waistband(body.m.waist + 1 + 3))
    if (o.pockets) pieces.push(pocketBag())
    void pocketNotches
    return pieces
  },
  materials(body, o) {
    return [
      'Thread to match',
      ...(str(o, 'waist') === 'elastic'
        ? [`Elastic 3.5 cm wide, ${Math.round(body.m.waist - 4)} cm`, 'A safety pin to thread it']
        : ['A zip, 18 cm', 'A button or a hook and bar', 'Fusible interfacing for the waistband']),
    ]
  },
  steps(o) {
    const elastic = str(o, 'waist') === 'elastic'
    const n = Number(str(o, 'tiers'))
    return [
      'Sew the panels of each tier together along their short sides to make a loop (leave one seam of the top tier open for a zip, or for pockets sew them in first). Neaten and press.',
      ...(o.pockets
        ? [
            'Sew a pocket bag to each side seam of the top tier between the notches, right sides together, before closing those seams. Sew round the bags as you close the seams, and press the pockets to the front.',
          ]
        : []),
      ...(n > 1
        ? [
            'Run two rows of long stitches along the top of each lower tier, draw them up to fit the tier above, and sew the tiers together. Press the seams up.',
          ]
        : []),
      'Run two rows of long stitches along the top of the skirt and draw them up evenly to fit the waist casing or waistband.',
      elastic
        ? 'Join the casing’s short ends, leaving a gap in the seam for the elastic, fold it in half lengthwise and sew it to the skirt. Thread the elastic through, overlap its ends and sew them, then close the gap.'
        : 'Put the zip into the open seam, sew the waistband on, and finish it with a button or a hook and bar.',
      'Press up the hem, turn under the raw edge and stitch. Press.',
    ]
  },
  sketch(body, o) {
    const ts = tiers(body, o)
    const w = body.m.waist / 4 + 4
    const s: Sketch = { shapes: [], lines: [] }
    let y = 0
    let x0 = w
    for (const t of ts) {
      const x1 = x0 + t.h * 0.22 + (t.around / 160) * 2
      s.shapes.push({ pts: [pt(-x0, y), pt(x0, y), pt(x1, y + t.h), pt(-x1, y + t.h)] })
      for (let x = -x0 + 2; x < x0 - 1; x += 2.5)
        s.lines.push({ pts: [pt(x, y), pt((x * x1) / x0, y + Math.min(8, t.h * 0.4))] })
      y += t.h
      x0 = x1
    }
    s.shapes.push({ pts: [pt(-w, -4), pt(w, -4), pt(w, 0), pt(-w, 0)] })
    s.lines.push({ pts: [pt(-x0 + 0.3, y - 2.5), pt(x0 - 0.3, y - 2.5)], dash: true })
    return s
  },
}
