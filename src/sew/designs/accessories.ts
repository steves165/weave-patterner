import { circle, Outline, rectPiece, sector } from '../draft'
import { pt } from '../geometry'
import type { Design, Piece, Sketch } from '../pattern'
import { num, str } from './common'

const box = (w: number, h: number, x = 0, y = 0) => [pt(x, y), pt(x + w, y), pt(x + w, y + h), pt(x, y + h)]

export const TOTE: Design = {
  id: 'tote-bag',
  name: 'Tote bag',
  category: 'Accessories',
  about: 'A sturdy tote with boxed corners, long or short handles, an optional lining and an inside pocket.',
  level: 'Beginner',
  fabrics: 'Canvas, denim, cotton drill, upholstery fabric; quilting cotton for the lining.',
  allowances: { seam: 1, hem: 3 },
  measurements: [],
  options: [
    { id: 'width', label: 'Width', type: 'number', unit: 'cm', min: 20, max: 60, step: 1, default: 38 },
    { id: 'height', label: 'Height', type: 'number', unit: 'cm', min: 20, max: 60, step: 1, default: 40 },
    { id: 'depth', label: 'Depth (gusset)', type: 'number', unit: 'cm', min: 0, max: 20, step: 1, default: 10 },
    {
      id: 'handles',
      label: 'Handles',
      type: 'choice',
      default: 'shoulder',
      choices: [
        { value: 'hand', label: 'Short (by hand)' },
        { value: 'shoulder', label: 'Long (on the shoulder)' },
      ],
    },
    { id: 'lining', label: 'Lined', type: 'bool', default: true },
    { id: 'pocket', label: 'Inside pocket', type: 'bool', default: true },
  ],
  draft(_, o) {
    const w = num(o, 'width')
    const h = num(o, 'height')
    const d = num(o, 'depth')
    const lined = Boolean(o.lining)
    // The body: the bag's width and half its depth either side, with squares cut from the bottom corners to box them.
    const W = w + d
    const H = h + d / 2
    const c = d / 2
    const body = (fabric: 'main' | 'lining'): Piece => {
      const o2 = new Outline(pt(0, 0)).line(pt(W, 0), lined ? 'seam' : 'hem')
      if (c > 0)
        o2.line(pt(W, H - c))
          .line(pt(W - c, H - c))
          .line(pt(W - c, H))
          .line(pt(c, H))
          .line(pt(c, H - c))
          .line(pt(0, H - c))
      else o2.line(pt(W, H)).line(pt(0, H))
      o2.line(pt(0, 0))
      return {
        id: fabric === 'main' ? 'body' : 'lining',
        name: fabric === 'main' ? 'Bag' : 'Lining',
        start: o2.start,
        segs: o2.segs,
        cut: 2,
        fabric,
        grain: [pt(W / 2, H * 0.2), pt(W / 2, H * 0.75)],
        guides: lined ? [] : [{ a: pt(0.5, 0), b: pt(W - 0.5, 0), label: '', kind: 'line' }],
        marks: o.handles
          ? [
              { kind: 'dot', at: pt(W / 2 - 6, 3) },
              { kind: 'dot', at: pt(W / 2 + 6, 3) },
            ]
          : [],
        labelAt: pt(W / 2, H / 2),
      }
    }
    const strap = o.handles === 'hand' ? 55 : 70
    const pieces: Piece[] = [
      body('main'),
      // Folded in four: 3 cm wide when done.
      rectPiece('handle', 'Handle', 12, strap, { cut: 2, kinds: ['raw', 'raw', 'raw', 'raw'] }),
    ]
    if (lined) pieces.push(body('lining'))
    if (o.pocket)
      pieces.push(
        rectPiece('pocket', 'Inside pocket', Math.min(24, w - 8), 36, {
          cut: 1,
          fabric: lined ? 'lining' : 'main',
          guides: [{ a: pt(0.5, 18), b: pt(Math.min(24, w - 8) - 0.5, 18), label: 'Fold', kind: 'line' }],
        }),
      )
    return pieces
  },
  materials: (_, o) => [
    'Strong thread (polyester)',
    'A jeans needle for heavy fabric',
    ...(o.lining ? [] : ['Bias binding or an overlocker to finish the seams']),
  ],
  steps(o) {
    const lined = Boolean(o.lining)
    return [
      'Make the handles: press each in half lengthwise, open it, press the long edges to the middle, then fold in half again. Topstitch both long edges.',
      ...(o.pocket
        ? [
            'Fold the pocket in half, right sides together, and sew round the open edges, leaving a gap to turn it. Turn, press and topstitch it to one lining piece (or the bag) 8 cm below the top, along the sides and bottom.',
          ]
        : []),
      'Sew the bag pieces together at the sides and bottom, right sides together. Press the seams open.',
      'Box each corner: pull the cut-out square open so the side seam lies on the bottom seam, and sew straight across.',
      ...(lined
        ? [
            'Make the lining in the same way, leaving a 12 cm gap in its bottom seam.',
            'Tack the handles to the right side of the bag at the dots, their ends at the top edge. Put the bag inside the lining, right sides together, and sew round the top.',
            'Turn the bag right side out through the gap, sew the gap closed, push the lining inside and topstitch round the top.',
          ]
        : [
            'Press the top edge down 1 cm and then 2 cm, tuck the handle ends under it at the dots, and topstitch round. Fold the handles up and stitch over them again.',
          ]),
    ]
  },
  sketch(_, o) {
    const w = num(o, 'width')
    const h = num(o, 'height')
    const strap = o.handles === 'hand' ? 20 : 30
    return {
      shapes: [{ pts: box(w, h, -w / 2, 0) }],
      lines: [
        { pts: [pt(-6, 0), pt(-8, -strap * 0.8), pt(0, -strap), pt(8, -strap * 0.8), pt(6, 0)] },
        { pts: [pt(-6 + 3, 0), pt(-5, -strap * 0.8 + 3), pt(0, -strap + 3), pt(5, -strap * 0.8 + 3), pt(6 - 3, 0)] },
        { pts: [pt(-w / 2 + 0.3, 2.5), pt(w / 2 - 0.3, 2.5)], dash: true },
      ],
    }
  },
}

export const APRON: Design = {
  id: 'apron',
  name: 'Apron',
  category: 'Accessories',
  about: 'A bib apron with a neck strap, long ties and a big front pocket, sized to you.',
  level: 'Beginner',
  fabrics: 'Cotton drill, canvas, denim, linen, oilcloth.',
  allowances: { seam: 1, hem: 2 },
  measurements: ['hips', 'napeToWaist', 'waistToKnee'],
  options: [
    {
      id: 'style',
      label: 'Style',
      type: 'choice',
      default: 'bib',
      choices: [
        { value: 'bib', label: 'Bib apron' },
        { value: 'waist', label: 'Waist apron' },
      ],
    },
    { id: 'pocket', label: 'Front pocket', type: 'bool', default: true },
    {
      id: 'lengthAdjust',
      label: 'Lengthen or shorten',
      type: 'number',
      unit: 'cm',
      min: -20,
      max: 30,
      step: 1,
      default: 0,
    },
  ],
  draft(body, o) {
    const half = body.m.hips / 4 + 5
    const bib = str(o, 'style') === 'bib'
    const bibH = bib ? body.m.napeToWaist - 14 : 0
    const len = bibH + body.m.waistToKnee - 8 + num(o, 'lengthAdjust')
    const bibHalf = 13
    const o2 = new Outline(pt(0, 0))
    if (bib)
      o2.line(pt(bibHalf, 0), 'hem')
        .line(pt(bibHalf, 4), 'hem')
        .curve(pt(bibHalf, bibH * 0.6), pt(half * 0.75, bibH), pt(half, bibH), 'hem')
    else o2.line(pt(half, 0), 'seam')
    o2.line(pt(half, len), 'hem').line(pt(0, len), 'hem').line(pt(0, 0), 'fold')
    const pieces: Piece[] = [
      {
        id: 'apron',
        name: 'Apron',
        start: o2.start,
        segs: o2.segs,
        cut: 1,
        onFold: true,
        fabric: 'main',
        marks: o.pocket ? [{ kind: 'dot', at: pt(half * 0.75, bibH + 8) }] : [],
        guides: bib ? [{ a: pt(0.5, bibH), b: pt(half - 0.5, bibH), label: 'Waist', kind: 'line' }] : [],
        labelAt: pt(half / 2, bibH + (len - bibH) / 2),
      },
      rectPiece('ties', 'Waist tie', 8, 80, { cut: 2, kinds: ['raw', 'seam', 'seam', 'seam'] }),
    ]
    if (bib) pieces.push(rectPiece('neck', 'Neck strap', 8, 60, { cut: 1 }))
    else pieces.push(rectPiece('band', 'Waistband', 2 * half, 8, { cut: 1, across: true }))
    if (o.pocket)
      pieces.push(
        rectPiece('pocket', 'Pocket', half * 1.5, 20, {
          cut: 1,
          kinds: ['hem', 'seam', 'seam', 'seam'],
          guides: [{ a: pt(half * 0.75, 2), b: pt(half * 0.75, 19), label: 'Stitch to divide', kind: 'line' }],
        }),
      )
    return pieces
  },
  materials: () => ['Thread to match', 'A D-ring pair, 3 cm, if you want an adjustable neck strap (optional)'],
  steps(o) {
    return [
      'Make the ties and strap: fold each in half lengthwise, right sides together, sew the long edge (and one end of each tie), turn them out and press.',
      ...(o.pocket
        ? [
            'Hem the pocket’s top edge, press the other edges under and topstitch it on at the dot, sewing down the middle to divide it.',
          ]
        : []),
      'Press under and stitch a narrow double hem along the sides and bottom of the apron.',
      str(o, 'style') === 'bib'
        ? 'Hem the curved sides, tucking the ties’ open ends under at the waistline. Hem the top of the bib with the strap’s ends tucked under at each corner. Fold the strap and ties out and stitch over them again.'
        : 'Sew the waistband to the top of the apron, the ties’ ends tucked into its ends, fold it over and stitch it down.',
    ]
  },
  sketch(body, o) {
    const half = body.m.hips / 4 + 5
    const bib = str(o, 'style') === 'bib'
    const bibH = bib ? body.m.napeToWaist - 14 : 0
    const len = bibH + body.m.waistToKnee - 8 + num(o, 'lengthAdjust')
    const s: Sketch = {
      shapes: [
        {
          pts: bib
            ? [
                pt(-13, 0),
                pt(13, 0),
                pt(13, 4),
                pt(half * 0.8, bibH * 0.9),
                pt(half, bibH),
                pt(half, len),
                pt(-half, len),
                pt(-half, bibH),
                pt(-half * 0.8, bibH * 0.9),
                pt(-13, 4),
              ]
            : box(2 * half, len, -half, 0),
        },
      ],
      lines: [
        ...(bib ? [{ pts: [pt(-12, 0), pt(-9, -14), pt(0, -18), pt(9, -14), pt(12, 0)] }] : []),
        { pts: [pt(half, bibH + 1), pt(half + 14, bibH + 4), pt(half + 12, bibH + 30)] },
        { pts: [pt(-half, bibH + 1), pt(-half - 14, bibH + 4), pt(-half - 12, bibH + 30)] },
      ],
    }
    if (o.pocket) {
      s.shapes.push({ pts: box(half * 1.5, 18, -half * 0.75, bibH + 8) })
      s.lines.push({ pts: [pt(0, bibH + 8), pt(0, bibH + 26)], dash: true })
    }
    return s
  },
}

export const CUSHION: Design = {
  id: 'cushion-cover',
  name: 'Cushion cover',
  category: 'Accessories',
  about: 'A square or oblong cushion cover with an envelope back (no zip) or a zip, for any pad size.',
  level: 'Beginner',
  fabrics: 'Cotton, linen, canvas, velvet, upholstery fabric.',
  allowances: { seam: 1.5, hem: 2 },
  measurements: [],
  options: [
    { id: 'width', label: 'Pad width', type: 'number', unit: 'cm', min: 20, max: 90, step: 1, default: 45 },
    { id: 'height', label: 'Pad height', type: 'number', unit: 'cm', min: 20, max: 90, step: 1, default: 45 },
    {
      id: 'back',
      label: 'Back',
      type: 'choice',
      default: 'envelope',
      choices: [
        { value: 'envelope', label: 'Envelope' },
        { value: 'zip', label: 'Zip' },
      ],
    },
  ],
  draft(_, o) {
    // A little smaller than the pad, so it's plump.
    const w = num(o, 'width') - 1
    const h = num(o, 'height') - 1
    if (str(o, 'back') === 'zip')
      return [rectPiece('front', 'Front', w, h, { cut: 1 }), rectPiece('back', 'Back', w, h / 2, { cut: 2 })]
    const flap = h * 0.62
    return [
      rectPiece('front', 'Front', w, h, { cut: 1 }),
      rectPiece('back', 'Back', w, flap, { cut: 2, kinds: ['seam', 'seam', 'hem', 'seam'] }),
    ]
  },
  materials: (_, o) => [
    'Thread to match',
    ...(str(o, 'back') === 'zip' ? [`A zip about ${num(o, 'width') - 5} cm`] : []),
  ],
  steps(o) {
    return str(o, 'back') === 'zip'
      ? [
          'Neaten the long edge of each back piece. Sew them together along that edge with long stitches, press the seam open, and sew the zip in over it. Unpick the long stitches over the zip.',
          'Open the zip part way. Put the front and back right sides together and sew all round. Clip the corners, turn it out through the zip and press.',
        ]
      : [
          'Hem one long edge of each back piece with a double-turned hem.',
          'Lay the front right side up, and the two backs on it right side down, hemmed edges overlapping in the middle and raw edges matching the front’s.',
          'Sew all round. Clip the corners, turn it out through the opening, push out the corners and press.',
        ]
  },
  sketch(_, o) {
    const w = num(o, 'width')
    const h = num(o, 'height')
    return {
      shapes: [
        {
          pts: [
            pt(-w / 2, 0),
            pt(0, 1),
            pt(w / 2, 0),
            pt(w / 2 - 1, h / 2),
            pt(w / 2, h),
            pt(0, h - 1),
            pt(-w / 2, h),
            pt(-w / 2 + 1, h / 2),
          ],
        },
      ],
      lines: [],
    }
  },
}

export const BUCKET_HAT: Design = {
  id: 'bucket-hat',
  name: 'Bucket hat',
  category: 'Accessories',
  about: 'A bucket hat to fit your head: crown, sides and a sloping brim, reversible if you like.',
  level: 'Confident beginner',
  fabrics: 'Cotton drill, denim, canvas, corduroy, waxed cotton; quilting cotton for the inside.',
  allowances: { seam: 1, hem: 1 },
  measurements: ['head'],
  options: [
    { id: 'brim', label: 'Brim width', type: 'number', unit: 'cm', min: 3, max: 10, step: 0.5, default: 6 },
    { id: 'sideHeight', label: 'Side height', type: 'number', unit: 'cm', min: 5, max: 12, step: 0.5, default: 8 },
    { id: 'reversible', label: 'Reversible (lined)', type: 'bool', default: true },
  ],
  draft(body, o) {
    const head = body.m.head + 1.5
    const top = head * 0.92
    const side = num(o, 'sideHeight')
    const brim = num(o, 'brim')
    // A cone's frustum laid flat: radii from where the cone would come to a point.
    const frustum = (small: number, large: number, slant: number) => {
      const r1 = (slant * small) / (large - small)
      return { r1, r2: r1 + slant, angle: large / (r1 + slant) }
    }
    const sides = frustum(top, head, side)
    const brims = frustum(head, head + 2 * Math.PI * brim * 0.85, brim)
    const half = (f: { r1: number; r2: number; angle: number }) =>
      sector(f.r1, f.r2, f.angle / 2, { inner: 'seam', outer: 'seam', start: 'seam', end: 'seam' })
    const reversible = Boolean(o.reversible)
    const s = half(sides)
    const b = half(brims)
    const c = circle(top / (2 * Math.PI))
    const piece = (
      id: string,
      name: string,
      shape: { start: ReturnType<typeof pt>; segs: Piece['segs'] },
      cut: number,
      fabric: Piece['fabric'] = 'main',
    ): Piece => ({
      id,
      name,
      start: shape.start,
      segs: shape.segs,
      cut,
      fabric,
      pair: false,
    })
    const pieces: Piece[] = [
      {
        ...piece('crown', 'Crown', c, 1),
        grain: [pt(top / (2 * Math.PI), 2), pt(top / (2 * Math.PI), top / Math.PI - 2)],
      },
      piece('side', 'Side', s, 2),
      piece('brim', 'Brim', b, reversible ? 2 : 4),
    ]
    if (reversible)
      pieces.push(
        {
          ...piece('crown-lining', 'Crown (inside)', c, 1, 'lining'),
          grain: [pt(top / (2 * Math.PI), 2), pt(top / (2 * Math.PI), top / Math.PI - 2)],
        },
        piece('side-lining', 'Side (inside)', s, 2, 'lining'),
        piece('brim-lining', 'Brim (inside)', b, 2, 'lining'),
      )
    return pieces
  },
  materials: (_, o) => [
    'Thread to match',
    ...(o.reversible ? [] : ['Medium fusible interfacing for the brim (optional)']),
  ],
  steps(o) {
    return [
      'Sew the two side pieces together at their short ends to make a ring. Press the seams open.',
      'Pin the crown into the top of the ring, right sides together, clipping the ring’s edge so it lies flat round the curve. Sew.',
      'Sew the brim pieces into a ring in the same way (and the second brim, for the underside).',
      'Sew the two brim rings together round the outside edge, right sides together. Trim, turn out, press and topstitch rows round the brim 1 cm apart.',
      'Sew the brim to the bottom of the hat, right sides together.',
      ...(o.reversible
        ? [
            'Make the inside hat (crown and sides) the same way, leaving a 7 cm gap in one side seam. Put it inside the outer hat, right sides together, sew round the brim seam, turn out through the gap and close it. Topstitch round the bottom of the sides.',
          ]
        : ['Neaten the seam inside with bias binding, press it up towards the crown and topstitch.']),
    ]
  },
  sketch(body, o) {
    const head = body.m.head + 1.5
    const r = head / Math.PI / 2
    const side = num(o, 'sideHeight')
    const brim = num(o, 'brim')
    return {
      shapes: [
        {
          pts: [
            pt(-r - brim * 1.4, side + brim * 0.7),
            pt(-r, side - 0.5),
            pt(r, side - 0.5),
            pt(r + brim * 1.4, side + brim * 0.7),
            pt(0, side + brim * 1.1),
          ],
        },
        { pts: [pt(-r * 0.92, 0), pt(r * 0.92, 0), pt(r, side), pt(-r, side)] },
      ],
      lines: [1, 2, 3].map((i) => ({
        pts: [
          pt(-r - brim * 1.4 * (i / 4), side + brim * 0.7 * (i / 4)),
          pt(0, side + brim * 1.1 * (i / 4)),
          pt(r + brim * 1.4 * (i / 4), side + brim * 0.7 * (i / 4)),
        ],
      })),
    }
  },
}
