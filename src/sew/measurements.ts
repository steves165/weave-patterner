/**
 * Body measurements, in centimetres: what each is and how to take it, and standard size charts to start from.
 */

export const MEASUREMENT_IDS = [
  'height',
  'bust',
  'waist',
  'hips',
  'neck',
  'shoulder',
  'backWidth',
  'napeToWaist',
  'waistToHip',
  'waistToKnee',
  'waistToFloor',
  'rise',
  'thigh',
  'upperArm',
  'armLength',
  'wrist',
  'head',
] as const
export type MeasurementId = (typeof MEASUREMENT_IDS)[number]
export type Measurements = Record<MeasurementId, number>

export const MEASUREMENTS: Record<MeasurementId, { name: string; how: string; min: number; max: number }> = {
  height: { name: 'Height', how: 'Standing straight against a wall, without shoes.', min: 90, max: 220 },
  bust: {
    name: 'Bust or chest',
    how: 'Around the fullest part of the bust or chest, under the arms, keeping the tape level.',
    min: 50,
    max: 180,
  },
  waist: { name: 'Waist', how: 'Around the natural waist, the narrowest part of the body.', min: 40, max: 170 },
  hips: { name: 'Hips', how: 'Around the fullest part of the hips and seat, with feet together.', min: 50, max: 190 },
  neck: { name: 'Neck', how: 'Around the base of the neck, where a necklace would sit.', min: 25, max: 55 },
  shoulder: {
    name: 'Shoulder',
    how: 'From the base of the neck to the tip of the shoulder bone, along the top of one shoulder.',
    min: 8,
    max: 20,
  },
  backWidth: {
    name: 'Back width',
    how: 'Across the back between the creases where the arms join the body, halfway down the armholes.',
    min: 22,
    max: 55,
  },
  napeToWaist: {
    name: 'Nape to waist',
    how: 'Down the centre back from the bone at the base of the neck to the waist.',
    min: 25,
    max: 60,
  },
  waistToHip: {
    name: 'Waist to hip',
    how: 'Down the side from the waist to the fullest part of the hips.',
    min: 10,
    max: 35,
  },
  waistToKnee: {
    name: 'Waist to knee',
    how: 'Down the side from the waist to the middle of the knee.',
    min: 35,
    max: 75,
  },
  waistToFloor: {
    name: 'Waist to floor',
    how: 'Down the side from the waist to the floor, without shoes.',
    min: 60,
    max: 140,
  },
  rise: {
    name: 'Rise (body rise)',
    how: 'Sitting on a hard chair: down the side from the waist to the seat of the chair.',
    min: 15,
    max: 40,
  },
  thigh: { name: 'Thigh', how: 'Around the fullest part of one thigh, just below the crotch.', min: 30, max: 100 },
  upperArm: { name: 'Upper arm', how: 'Around the fullest part of the upper arm.', min: 15, max: 60 },
  armLength: {
    name: 'Arm length',
    how: 'From the tip of the shoulder over a slightly bent elbow to the wrist bone.',
    min: 35,
    max: 80,
  },
  wrist: { name: 'Wrist', how: 'Around the wrist bone.', min: 10, max: 25 },
  head: { name: 'Head', how: 'Around the head above the ears, across the forehead.', min: 40, max: 66 },
}

/** Whether the figure has a bust to shape for (darts), or a flatter chest. */
export type Figure = 'bust' | 'chest'

export interface Size {
  /** The size's name, as "UK 12" or "M". */
  name: string
  figure: Figure
  m: Measurements
}

const round = (n: number) => Math.round(n * 10) / 10

/** Women's sizes: UK 6 to 24 (EU 34 to 52, US 2 to 20), 5 cm apart at the bust. */
export const WOMENS: Size[] = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map((uk) => {
  const s = (uk - 12) / 2
  return {
    name: `UK ${uk}`,
    figure: 'bust',
    m: {
      height: round(166 + Math.max(-2, Math.min(2, s))),
      bust: 91 + 5 * s,
      waist: 71 + 5 * s,
      hips: 96 + 5 * s,
      neck: round(36 + 1 * s),
      shoulder: round(12.2 + 0.2 * s),
      backWidth: round(34.4 + 1.2 * s),
      napeToWaist: round(41 + 0.4 * s),
      waistToHip: round(20.6 + 0.2 * s),
      waistToKnee: round(58.5 + 0.2 * s),
      waistToFloor: round(104 + 0.5 * Math.max(-2, Math.min(2, s))),
      rise: round(28 + 0.5 * s),
      thigh: round(56 + 3 * s),
      upperArm: round(28 + 1.6 * s),
      armLength: round(58 + 0.3 * Math.max(-2, Math.min(2, s))),
      wrist: round(15.5 + 0.3 * s),
      head: round(56 + 0.3 * s),
    },
  }
})

/** Men's sizes: XS to 3XL, chest 86 to 126 cm. */
export const MENS: Size[] = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'].map((name, i) => {
  const s = i - 2
  return {
    name,
    figure: 'chest',
    m: {
      height: round(178 + Math.max(-2, Math.min(2, s)) * 1.5),
      bust: 98 + 6 * s,
      waist: 84 + 6.5 * s,
      hips: 100 + 6 * s,
      neck: round(39 + 1.5 * s),
      shoulder: round(15.5 + 0.4 * s),
      backWidth: round(38.5 + 1.4 * s),
      napeToWaist: round(45 + 0.5 * s),
      waistToHip: round(21 + 0.3 * s),
      waistToKnee: round(60 + 0.3 * s),
      waistToFloor: round(110 + Math.max(-2, Math.min(2, s))),
      rise: round(27 + 0.6 * s),
      thigh: round(58 + 3 * s),
      upperArm: round(32 + 2 * s),
      armLength: round(64 + 0.6 * Math.max(-2, Math.min(2, s))),
      wrist: round(17.5 + 0.4 * s),
      head: round(58 + 0.4 * s),
    },
  }
})

export const SIZE_CHARTS = { womens: WOMENS, mens: MENS } as const
export type ChartId = keyof typeof SIZE_CHARTS

export const sizeByName = (name: string): Size | undefined => [...WOMENS, ...MENS].find((s) => s.name === name)

/** Measurements kept within sensible bounds, missing ones taken from `fallback`. */
export function cleanMeasurements(m: unknown, fallback: Measurements): Measurements {
  const out = { ...fallback }
  if (m && typeof m === 'object')
    for (const id of MEASUREMENT_IDS) {
      const v = (m as Record<string, unknown>)[id]
      const { min, max } = MEASUREMENTS[id]
      if (typeof v === 'number' && Number.isFinite(v)) out[id] = Math.max(min, Math.min(max, v))
    }
  return out
}

/** Units for showing lengths. */
export type Units = 'cm' | 'in'

/** A length for reading: centimetres to a millimetre, or inches to the nearest eighth. */
export function formatLength(cm: number, units: Units): string {
  if (units === 'cm') return `${Math.round(cm * 10) / 10} cm`
  const eighths = Math.round((cm / 2.54) * 8)
  const whole = Math.floor(eighths / 8)
  const frac = eighths % 8
  if (!frac) return `${whole}″`
  const [n, d] = frac % 4 === 0 ? [frac / 4, 2] : frac % 2 === 0 ? [frac / 2, 4] : [frac, 8]
  return `${whole ? `${whole} ` : ''}${n}/${d}″`
}

/** cm to the units' number (for fields), and back. */
export const toUnits = (cm: number, units: Units) => (units === 'cm' ? round(cm) : Math.round((cm / 2.54) * 8) / 8)
export const fromUnits = (v: number, units: Units) => (units === 'cm' ? v : v * 2.54)

/** A length of fabric to buy: metres to the next 10 cm, or yards to the next eighth. */
export function fabricLength(cm: number, units: Units): string {
  if (units === 'cm') return `${(Math.ceil(cm / 10) / 10).toFixed(1)} m`
  const eighths = Math.ceil(cm / 2.54 / 36 / 0.125)
  const whole = Math.floor(eighths / 8)
  const frac = eighths % 8
  const fr = frac ? (frac % 4 === 0 ? '1/2' : frac % 2 === 0 ? `${frac / 2}/4` : `${frac}/8`) : ''
  return `${whole ? whole : ''}${whole && fr ? ' ' : ''}${fr || (whole ? '' : '0')} yd`
}
