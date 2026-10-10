import { type BodiceSpec, bodice, facing, type Neckline, rectPiece, sleeve } from '../draft'
import { pt } from '../geometry'
import type { Body, Design, Options, Piece } from '../pattern'
import { LENGTH_ADJUST, num, pocketBag, pocketNotches, SLEEVES, sleeveLength, str, topSketch } from './common'

const FIT = (dflt: string, close = 'Fitted') => ({
  id: 'fit',
  label: 'Fit',
  type: 'choice' as const,
  default: dflt,
  choices: [
    { value: 'fitted', label: close },
    { value: 'regular', label: 'Regular' },
    { value: 'relaxed', label: 'Relaxed' },
  ],
})

const NECKLINE = (dflt: string, values: Neckline[]) => ({
  id: 'neckline',
  label: 'Neckline',
  type: 'choice' as const,
  default: dflt,
  choices: values.map((v) => ({
    value: v,
    label: { crew: 'Crew', scoop: 'Scoop', v: 'V-neck', boat: 'Boat', high: 'Round' }[v],
  })),
})

/** Lengths for tops, down from the nape. */
function topLength(m: Body['m'], choice: string, adjust: number): number {
  const waist = m.napeToWaist
  const hip = waist + m.waistToHip
  return (({ cropped: waist + 4, hip: hip + 2, tunic: hip + 16 } as Record<string, number>)[choice] ?? hip + 2) + adjust
}

/** Seams for a knit top's band or binding: the neckline all round, a little shorter so it sits flat. */
const bandLength = (neck: { front: number; back: number }, ratio: number) => 2 * (neck.front + neck.back) * ratio

function knitTop(body: Body, o: Options, sleeveless: boolean) {
  const ease = { fitted: 0, regular: 6, relaxed: 14 }[str(o, 'fit')] ?? 6
  const spec: BodiceSpec = {
    m: body.m,
    figure: body.figure,
    ease,
    hipEase: ease + 2,
    length: topLength(body.m, str(o, 'length'), num(o, 'lengthAdjust')),
    neckline: str(o, 'neckline') as Neckline,
    shape: str(o, 'fit') === 'fitted' ? 'fitted' : 'straight',
    knit: true,
    sleeveless,
    drop: str(o, 'fit') === 'relaxed' && !sleeveless ? 2 : 0,
  }
  return bodice(spec)
}

export const TSHIRT: Design = {
  id: 't-shirt',
  name: 'T-shirt',
  category: 'Tops',
  about: 'A classic T-shirt in stretch knit, with a neckband: crew, scoop or V-neck, short to long sleeves.',
  level: 'Confident beginner',
  fabrics: 'Cotton jersey, cotton-elastane or viscose jersey, interlock. Ribbing for the neckband if you like.',
  knit: true,
  allowances: { seam: 1, hem: 2.5 },
  measurements: [
    'bust',
    'waist',
    'hips',
    'neck',
    'shoulder',
    'backWidth',
    'napeToWaist',
    'waistToHip',
    'upperArm',
    'armLength',
    'wrist',
  ],
  options: [
    FIT('regular'),
    NECKLINE('crew', ['crew', 'scoop', 'v']),
    SLEEVES('short', false),
    {
      id: 'length',
      label: 'Length',
      type: 'choice',
      default: 'hip',
      choices: [
        { value: 'cropped', label: 'Cropped' },
        { value: 'hip', label: 'Hip' },
        { value: 'tunic', label: 'Tunic' },
      ],
    },
    LENGTH_ADJUST,
  ],
  draft(body, o) {
    const b = knitTop(body, o, false)
    const len = sleeveLength(str(o, 'sleeves'), body.m.armLength)
    const sl = sleeve({
      m: body.m,
      armhole: b.armhole.front + b.armhole.back,
      ease: { fitted: 2, regular: 5, relaxed: 9 }[str(o, 'fit')] ?? 5,
      capEase: 0,
      length: len,
      hem: str(o, 'sleeves') === 'long' ? body.m.wrist + 7 : 0.92 * (body.m.upperArm + 5),
    })
    const band = bandLength(b.neck, str(o, 'neckline') === 'v' ? 0.9 : 0.85)
    const pieces: Piece[] = [
      b.front,
      b.back,
      { ...sl, stretch: true },
      rectPiece('neckband', 'Neckband', band, 4, {
        cut: 1,
        stretch: true,
        across: true,
        guides: [{ a: pt(0.5, 2), b: pt(band - 0.5, 2), label: 'Fold', kind: 'line' }],
      }),
    ]
    return pieces
  },
  materials: () => ['Thread to match', 'A stretch or ballpoint needle', 'A twin needle for the hems (optional)'],
  steps(o) {
    const v = str(o, 'neckline') === 'v'
    return [
      'Sew the front to the back at the shoulders, right sides together, with a narrow zigzag, a stretch stitch or an overlocker.',
      `Join the neckband's short ends into a loop${v ? ', or leave them open for a V and overlap them at the point' : ''}. Fold it in half lengthwise, wrong sides together.`,
      'Mark the neckband and the neckline in quarters. Pin the band to the right side of the neckline, raw edges together, matching the marks; the band is shorter, so stretch it to fit as you sew.',
      'Press the seam towards the body. Topstitch close to the seam if you like.',
      'Pin each sleeve into its armhole, right sides together: the dot at the top to the shoulder seam, one notch to the front, two to the back. Sew.',
      'Sew each side seam and sleeve seam in one go, from the hem to the end of the sleeve, matching the underarm seams.',
      'Press up the hems on the body and sleeves and sew them with a twin needle or a zigzag. Press.',
    ]
  },
  sketch(body, o) {
    const b = knitTop(body, o, false)
    const len = sleeveLength(str(o, 'sleeves'), body.m.armLength)
    return topSketch(b, {
      sleeve: {
        length: len,
        hem: str(o, 'sleeves') === 'long' ? (body.m.wrist + 7) / 2 : 0.46 * (body.m.upperArm + 5),
        cap: 8,
      },
      band: true,
    })
  },
}

export const TANK: Design = {
  id: 'tank-top',
  name: 'Tank top',
  category: 'Tops',
  about: 'A sleeveless knit top with bound neck and armholes: scoop, crew or V-neck.',
  level: 'Beginner',
  fabrics: 'Cotton or viscose jersey, bamboo jersey, rib knit.',
  knit: true,
  allowances: { seam: 1, hem: 2.5 },
  measurements: ['bust', 'waist', 'hips', 'neck', 'shoulder', 'backWidth', 'napeToWaist', 'waistToHip'],
  options: [
    FIT('fitted'),
    NECKLINE('scoop', ['scoop', 'crew', 'v']),
    {
      id: 'length',
      label: 'Length',
      type: 'choice',
      default: 'hip',
      choices: [
        { value: 'cropped', label: 'Cropped' },
        { value: 'hip', label: 'Hip' },
        { value: 'tunic', label: 'Tunic' },
      ],
    },
    LENGTH_ADJUST,
  ],
  draft(body, o) {
    const b = knitTop(body, o, true)
    const neck = bandLength(b.neck, 0.85)
    const arm = 2 * (b.armhole.front + b.armhole.back) * 0.9
    return [
      b.front,
      b.back,
      rectPiece('neck-binding', 'Neck binding', neck, 4, { cut: 1, stretch: true, across: true }),
      rectPiece('armhole-binding', 'Armhole binding', arm / 2, 4, { cut: 2, stretch: true, across: true }),
    ]
  },
  materials: () => ['Thread to match', 'A stretch or ballpoint needle', 'A twin needle for the hem (optional)'],
  steps: () => [
    'Sew the front to the back at the shoulders, right sides together, with a stretch stitch or an overlocker.',
    'Join the neck binding into a loop and fold it in half lengthwise. Quarter-mark it and the neckline, and sew it to the right side of the neckline, stretching the binding to fit.',
    'Sew the armhole bindings to the armholes flat in the same way, stretching them slightly round the curves.',
    'Sew the side seams from the hem up through the ends of the armhole bindings.',
    'Press the bindings’ seams towards the body and topstitch them down.',
    'Press up the hem and sew it with a twin needle or a zigzag.',
  ],
  sketch(body, o) {
    return topSketch(knitTop(body, o, true), { band: true })
  },
}

/** A woven dress or top's bodice for the options. */
function wovenBodice(body: Body, o: Options, length: number, toWaist = false) {
  const ease = { fitted: 6, regular: 10, relaxed: 16 }[str(o, 'fit')] ?? 10
  return bodice({
    m: body.m,
    figure: body.figure,
    ease,
    hipEase: ease,
    length,
    neckline: str(o, 'neckline') as Neckline,
    shape: (str(o, 'shape') || 'straight') as BodiceSpec['shape'],
    knit: false,
    sleeveless: str(o, 'sleeves') === 'none',
    backSeam: o.zip !== false,
    toWaist,
  })
}

function dressLength(m: Body['m'], choice: string, adjust: number) {
  const waist = m.napeToWaist
  return (
    ((
      {
        tunic: waist + m.waistToHip + 16,
        above: waist + m.waistToKnee - 8,
        knee: waist + m.waistToKnee,
        midi: waist + m.waistToKnee + 18,
      } as Record<string, number>
    )[choice] ?? waist + m.waistToKnee) + adjust
  )
}

export const SHIFT_DRESS: Design = {
  id: 'shift-dress',
  name: 'Shift dress',
  category: 'Dresses',
  about:
    'A simple woven dress, straight or A-line, with a bust dart, facings and a back zip; sleeveless to long sleeves.',
  level: 'Confident beginner',
  fabrics: 'Cotton lawn, poplin, linen, chambray, crepe, light wool.',
  measurements: [
    'bust',
    'waist',
    'hips',
    'neck',
    'shoulder',
    'backWidth',
    'napeToWaist',
    'waistToHip',
    'waistToKnee',
    'upperArm',
    'armLength',
    'wrist',
  ],
  options: [
    FIT('regular', 'Close'),
    {
      id: 'shape',
      label: 'Shape',
      type: 'choice',
      default: 'aline',
      choices: [
        { value: 'straight', label: 'Straight' },
        { value: 'aline', label: 'A-line' },
        { value: 'fitted', label: 'Fitted waist' },
      ],
    },
    NECKLINE('high', ['high', 'scoop', 'v', 'boat']),
    SLEEVES('short'),
    {
      id: 'length',
      label: 'Length',
      type: 'choice',
      default: 'knee',
      choices: [
        { value: 'tunic', label: 'Tunic' },
        { value: 'above', label: 'Above the knee' },
        { value: 'knee', label: 'Knee' },
        { value: 'midi', label: 'Midi' },
      ],
    },
    {
      id: 'zip',
      label: 'Zip at the back',
      type: 'bool',
      default: true,
      help: 'Without one, choose a scoop, V or boat neck so it goes over your head.',
    },
    { id: 'pockets', label: 'Pockets in the side seams', type: 'bool', default: true },
    LENGTH_ADJUST,
  ],
  draft(body, o) {
    const b = wovenBodice(body, o, dressLength(body.m, str(o, 'length'), num(o, 'lengthAdjust')))
    const zip = o.zip !== false
    const pieces: Piece[] = [b.front, b.back]
    pieces.push(
      facing('front-facing', 'Front facing', b.key.frontNeck, b.key.neckSegsFront, b.key.sp, 6, true),
      facing('back-facing', 'Back facing', b.key.backNeck, b.key.neckSegsBack, b.key.backSp, 6, !zip),
    )
    if (str(o, 'sleeves') !== 'none') {
      const sl = sleeve({
        m: body.m,
        armhole: b.armhole.front + b.armhole.back,
        ease: { fitted: 5, regular: 7, relaxed: 10 }[str(o, 'fit')] ?? 7,
        capEase: 2,
        length: sleeveLength(str(o, 'sleeves'), body.m.armLength),
        hem: str(o, 'sleeves') === 'long' ? body.m.wrist + 12 : 0.9 * (body.m.upperArm + 7),
      })
      pieces.push(sl)
    } else {
      // Bias binding for the armholes.
      const arm = b.armhole.front + b.armhole.back
      pieces.push(
        rectPiece('armhole-binding', 'Armhole binding (bias)', arm + 3, 4, { cut: 2, bias: true, across: true }),
      )
    }
    if (o.pockets) {
      const at = b.key.waistY + 2
      b.front.notches = [...(b.front.notches ?? []), ...pocketNotches(b.front, at + b.key.dartIntake)]
      b.back.notches = [...(b.back.notches ?? []), ...pocketNotches(b.back, at)]
      pieces.push(pocketBag())
    }
    return pieces
  },
  materials: (body, o) => [
    'Thread to match',
    'Light fusible interfacing for the facings',
    ...(o.zip !== false ? [`An invisible zip, ${Math.round((body.m.napeToWaist + 12) / 5) * 5} cm`] : []),
  ],
  steps(o) {
    const zip = o.zip !== false
    const sleeves = str(o, 'sleeves') !== 'none'
    return [
      'Fuse interfacing to the wrong side of the facings. Neaten their outer edges with a zigzag or overlocker.',
      'Sew the bust darts in the front: fold along the dart’s centre, match the legs, and sew from the side seam to the point. Press the darts down.',
      ...(str(o, 'shape') === 'fitted'
        ? [
            'Sew the waist darts in the front and back, tapering to nothing at each point. Press them towards the centre.',
          ]
        : []),
      ...(zip
        ? [
            'Neaten the centre back edges. Put the invisible zip in at the top of the centre back seam, its teeth on the sewing line, then sew the rest of the seam below it.',
          ]
        : []),
      'Sew the front to the back at the shoulders. Press the seams open.',
      `Join the facings at the shoulders. Sew the facing to the neckline, right sides together${zip ? ', folding the facing ends back around the zip' : ''}. Clip the curve, understitch, turn the facing inside and press.`,
      ...(o.pockets
        ? [
            'Sew a pocket bag to each front and back side seam between the notches, right sides together. Press them outwards.',
          ]
        : []),
      `Sew the side seams${o.pockets ? ', pivoting round the pocket bags' : ''}. Press them open${o.pockets ? ' and the pockets towards the front' : ''}.`,
      ...(sleeves
        ? [
            'Sew each sleeve’s underarm seam. Run two rows of long stitches over the cap between the notches and draw them up a little.',
            'Set each sleeve into its armhole, right sides together: the dot to the shoulder seam, one notch to the front, two to the back. Ease in the cap and sew. Neaten the seams.',
            'Hem the sleeves: press up the allowance, turn under the raw edge and stitch.',
          ]
        : [
            'Fold the bias binding in half lengthwise and sew it to the right side of each armhole. Turn it inside, press and stitch it down.',
          ]),
      'Press up the hem, turn under the raw edge and stitch it by machine or by hand. Press the dress.',
    ]
  },
  sketch(body, o) {
    const b = wovenBodice(body, o, dressLength(body.m, str(o, 'length'), num(o, 'lengthAdjust')))
    const sleeves = str(o, 'sleeves')
    return topSketch(b, {
      sleeve:
        sleeves === 'none'
          ? undefined
          : {
              length: sleeveLength(sleeves, body.m.armLength),
              hem: sleeves === 'long' ? (body.m.wrist + 12) / 2 : 0.45 * (body.m.upperArm + 7),
              cap: 12,
            },
    })
  },
}

export const BODICE_BLOCK: Design = {
  id: 'bodice-block',
  name: 'Bodice block',
  category: 'Blocks',
  about:
    'A close-fitting bodice and sleeve to your measurements, with bust and waist darts: test the fit in calico, then design from it.',
  level: 'Intermediate',
  fabrics: 'Calico or muslin for a toile (a test version).',
  allowances: { seam: 1.5, hem: 1.5 },
  measurements: ['bust', 'waist', 'neck', 'shoulder', 'backWidth', 'napeToWaist', 'upperArm', 'armLength', 'wrist'],
  options: [
    {
      id: 'ease',
      label: 'Ease at the bust',
      type: 'number',
      unit: 'cm',
      min: 0,
      max: 20,
      step: 0.5,
      default: 8,
      help: 'Room to move, added all round. About 8 cm for a dress block, 10 to 12 for a jacket.',
    },
    { id: 'sleeve', label: 'With a sleeve', type: 'bool', default: true },
  ],
  draft(body, o) {
    const b = bodice({
      m: body.m,
      figure: body.figure,
      ease: num(o, 'ease'),
      hipEase: num(o, 'ease'),
      length: body.m.napeToWaist,
      neckline: 'high',
      shape: 'fitted',
      knit: false,
      sleeveless: false,
      toWaist: true,
    })
    const pieces: Piece[] = [b.front, b.back]
    if (o.sleeve) {
      const sl = sleeve({
        m: body.m,
        armhole: b.armhole.front + b.armhole.back,
        ease: 6,
        capEase: 2.5,
        length: body.m.armLength + 1,
        hem: body.m.wrist + 10,
      })
      pieces.push(sl)
    }
    return pieces
  },
  materials: () => [
    'Calico or muslin',
    'Thread in a contrasting colour, for the toile',
    'A pencil and ruler to mark the lines',
  ],
  steps: () => [
    'Trace the sewing lines, darts, waistline and grainlines onto the calico: they matter more than the cutting lines in a toile.',
    'Sew the darts with long stitches, then the shoulder and side seams. Press.',
    'Sew the sleeve seam and set the sleeve in, easing the cap between the notches.',
    'Try it on inside out, pinned closed at the centre back. Pin out any looseness and mark where it pulls, then change the pattern to match.',
    'When it fits, save the measurements and use the block to design from: move darts, add fullness or change the neckline.',
  ],
  sketch(body, o) {
    const b = bodice({
      m: body.m,
      figure: body.figure,
      ease: num(o, 'ease'),
      hipEase: num(o, 'ease'),
      length: body.m.napeToWaist,
      neckline: 'high',
      shape: 'fitted',
      knit: false,
      sleeveless: false,
      toWaist: true,
    })
    return topSketch(b, {
      hemStitch: false,
      sleeve: o.sleeve ? { length: body.m.armLength + 1, hem: (body.m.wrist + 10) / 2, cap: 14 } : undefined,
    })
  },
}
