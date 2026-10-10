import { lerpN, Outline, rectPiece } from '../draft'
import { type Pt, pt } from '../geometry'
import type { Body, Design, Options, Piece, Sketch } from '../pattern'
import { LENGTH_ADJUST, num, pocketBag, sideAt, str } from './common'

interface Leg {
  piece: Piece
  /** The fork (crotch point), and the waist width. */
  fork: Pt
  waist: number
  hem: { inner: Pt; outer: Pt }
}

function legLength(m: Body['m'], choice: string, adjust: number) {
  const crotch = m.rise + 1.5
  return (
    ((
      { shorts: crotch + 9, knee: m.waistToKnee + 3, cropped: m.waistToFloor - 14, full: m.waistToFloor - 2 } as Record<
        string,
        number
      >
    )[choice] ?? m.waistToFloor - 2) + adjust
  )
}

/**
 * One leg of pull-on trousers, front or back: centre seam on the left (the fork reaching out past it), side seam on
 * the right, waist at y = 0 and a separate elastic casing. The back is wider, with a longer fork and a raised,
 * slanted centre back for sitting.
 */
function leg(body: Body, o: Options, front: boolean): Leg {
  const { m } = body
  const ease = { regular: 8, relaxed: 14 }[str(o, 'fit')] ?? 8
  const hq = (m.hips + ease) / 4 + (front ? -1 : 1)
  const crotchY = m.rise + 1.5 + ease / 10
  const hipY = Math.min(m.waistToHip, crotchY - 5)
  const fork = front ? m.hips / 20 + 0.5 + ease / 20 : m.hips / 10 - 0.5 + ease / 12
  const len = legLength(m, str(o, 'length'), num(o, 'lengthAdjust'))
  const forkPt = pt(-fork, crotchY + (front ? 0 : 0.7))
  const crease = (hq - fork) / 2
  const legStyle = str(o, 'leg')
  const fullHem = { wide: m.hips * 0.62, straight: m.hips * 0.48, tapered: m.hips * 0.36 }[legStyle] ?? m.hips * 0.48
  const kneeY = m.waistToKnee
  const kneeW = { wide: m.hips * 0.6, straight: m.hips * 0.5, tapered: m.hips * 0.44 }[legStyle] ?? m.hips * 0.5
  const half = (w: number) => w / 4 + (front ? -1 : 1)
  // The width at the hem follows the line from the crotch to the knee to the full-length hem.
  const atY = (y: number): number => {
    const top = (hq + fork) / 2
    if (y <= kneeY) return lerpN(top, half(kneeW), (y - crotchY) / (kneeY - crotchY))
    return lerpN(half(kneeW), half(fullHem), (y - kneeY) / (m.waistToFloor - kneeY))
  }
  const hemHalf = atY(len)
  const inner = pt(crease - hemHalf, len)
  const outer = pt(crease + hemHalf, len)
  const knee = len > kneeY + 4 ? atY(kneeY) : null
  const cb = front ? pt(0, 0) : pt(2, -2.5)
  const o2 = new Outline(cb).line(pt(hq, 0)).line(pt(hq, hipY))
  if (knee) o2.line(pt(crease + knee, kneeY))
  o2.line(outer).line(inner, 'hem')
  if (knee) o2.line(pt(crease - knee, kneeY))
  o2.line(forkPt)
    .curve(pt(-fork * 0.45, forkPt.y), pt(0, crotchY - (crotchY - hipY) * 0.35), pt(0, hipY))
    .line(cb)
  const piece: Piece = {
    id: front ? 'front' : 'back',
    name: front ? 'Front' : 'Back',
    start: o2.start,
    segs: o2.segs,
    cut: 2,
    pair: true,
    fabric: 'main',
    grain: [pt(crease, crotchY + 4), pt(crease, Math.min(len - 6, crotchY + 40))],
    notches: [{ at: pt(-fork * 0.5, forkPt.y - 0.2), double: !front }],
    guides: [
      { a: pt(0.5, crotchY), b: pt(hq - 0.5, crotchY), label: 'Crotch line', kind: 'line' },
      ...(len > crotchY + 25
        ? [
            {
              a: pt(crease - atY(crotchY + 20) + 1, crotchY + 20),
              b: pt(crease + atY(crotchY + 20) - 1, crotchY + 20),
              label: 'Lengthen or shorten here',
              kind: 'adjust' as const,
            },
          ]
        : []),
    ],
    labelAt: pt(crease, crotchY + Math.min(15, (len - crotchY) / 2)),
  }
  if (o.pockets) piece.notches?.push({ at: sideAt(piece, 3) }, { at: sideAt(piece, 18) })
  return { piece, fork: forkPt, waist: hq - cb.x, hem: { inner, outer } }
}

export const TROUSERS: Design = {
  id: 'trousers',
  name: 'Pull-on trousers',
  category: 'Trousers',
  about:
    'Easy trousers with an elastic waist: shorts, knee, cropped or full length, wide, straight or tapered legs, and pockets.',
  level: 'Beginner',
  fabrics: 'Linen, cotton twill, chambray, viscose, flannel for pyjamas, light denim.',
  measurements: ['waist', 'hips', 'waistToHip', 'rise', 'waistToKnee', 'waistToFloor', 'thigh'],
  options: [
    {
      id: 'length',
      label: 'Length',
      type: 'choice',
      default: 'full',
      choices: [
        { value: 'shorts', label: 'Shorts' },
        { value: 'knee', label: 'Knee' },
        { value: 'cropped', label: 'Cropped' },
        { value: 'full', label: 'Full length' },
      ],
    },
    {
      id: 'leg',
      label: 'Leg',
      type: 'choice',
      default: 'straight',
      choices: [
        { value: 'wide', label: 'Wide' },
        { value: 'straight', label: 'Straight' },
        { value: 'tapered', label: 'Tapered' },
      ],
    },
    {
      id: 'fit',
      label: 'Fit',
      type: 'choice',
      default: 'regular',
      choices: [
        { value: 'regular', label: 'Regular' },
        { value: 'relaxed', label: 'Relaxed' },
      ],
    },
    { id: 'pockets', label: 'Pockets in the side seams', type: 'bool', default: true },
    LENGTH_ADJUST,
  ],
  draft(body, o) {
    const f = leg(body, o, true)
    const b = leg(body, o, false)
    const around = 2 * (f.waist + b.waist)
    const pieces: Piece[] = [
      f.piece,
      b.piece,
      rectPiece('casing', 'Waist casing', around, 9, {
        cut: 1,
        across: true,
        guides: [{ a: pt(0.5, 4.5), b: pt(around - 0.5, 4.5), label: 'Fold', kind: 'line' }],
      }),
    ]
    if (o.pockets) pieces.push(pocketBag())
    return pieces
  },
  materials: (body) => [
    'Thread to match',
    `Elastic 3 cm wide, ${Math.round(body.m.waist - 5)} cm`,
    'A safety pin to thread the elastic',
  ],
  steps(o) {
    return [
      ...(o.pockets
        ? [
            'Sew a pocket bag to each front and back side seam between the notches, right sides together. Press them outwards.',
          ]
        : []),
      `Sew each front to a back along the side seam${o.pockets ? ', pivoting round the pocket bags; press the pockets to the front' : ''}. Then sew the inside leg seam from hem to hem. Neaten and press.`,
      'Turn one leg right side out and put it inside the other, right sides together. Sew the crotch seam from the front waist round to the back waist, matching the inside leg seams. Sew again over the curve to strengthen it; trim and neaten.',
      'Join the casing’s short ends into a loop, leaving a 4 cm gap in the seam for the elastic. Fold it in half lengthwise and sew it to the waist, the join at the centre back.',
      'Thread the elastic through, overlap its ends by 2 cm and sew them together. Close the gap and spread the gathers evenly.',
      'Press up the hems, turn under the raw edges and stitch. Press.',
    ]
  },
  sketch(body, o) {
    const f = leg(body, o, true)
    const w = f.waist + 0.5
    const crotch = f.fork.y
    const { inner, outer } = f.hem
    const legW = outer.x - inner.x
    const hemY = inner.y
    const s: Sketch = { shapes: [], lines: [] }
    for (const k of [1, -1]) {
      const pts = [
        pt(0, 0),
        pt(k * w, 0),
        pt(k * w, crotch * 0.6),
        pt(k * (Math.max(legW, 4) + 0.6), hemY),
        pt(k * 0.6, hemY),
        pt(0, crotch),
      ]
      s.shapes.push({ pts })
      s.lines.push({ pts: [pt(k * (legW * 0.1 + 0.8), hemY - 2.5), pt(k * (legW + 0.4), hemY - 2.5)], dash: true })
      if (o.pockets) s.lines.push({ pts: [pt(k * (w - 0.3), 3), pt(k * (w - 3.5), 4), pt(k * (w - 0.3), 18)] })
    }
    s.shapes.push({ pts: [pt(-w, -4.5), pt(w, -4.5), pt(w, 0), pt(-w, 0)] })
    for (let x = -w + 1.5; x < w - 1; x += 2) s.lines.push({ pts: [pt(x, -4.2), pt(x, -0.3)] })
    return s
  },
}
