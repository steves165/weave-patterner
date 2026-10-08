import { defaultCalcInput, type Units } from './calculator'
import type { Texture } from './textures'
import type { Draft } from './weave'
import { type Yarn, yarnFor } from './yarns'

/** Sett (ends) and picks per cm (metric) or per inch (imperial), as entered in the warp calculator. */
export interface Density {
  units: Units
  sett: number
  ppi: number
}

/** How thick each thread is and how far apart the picks are, both relative to the spacing between ends. */
export interface ClothLook {
  warpSize: number[]
  weftSize: number[]
  pickSpacing: number
  /** Each thread's yarn texture (smooth when its yarn doesn't say). */
  warpTexture: Texture[]
  weftTexture: Texture[]
  /** True when at least one thread's size or texture came from its yarn. */
  fromYarns: boolean
}

/** A yarn's packing density in g/cm³: lower than the fibre's, as spun yarn holds air. */
const YARN_DENSITY = 0.6
/** Thread size relative to end spacing when its yarn has no grist: a typical balanced cloth. */
export const DEFAULT_SIZE = 1

/**
 * A yarn's diameter in mm from its grist (metres per kg, or yards per lb). Tex (grams per km) is mass per length; with
 * the yarn's packing density that gives its cross-section and so its diameter.
 */
export function yarnDiameter(grist: number, units: Units): number {
  const metresPerKg = units === 'metric' ? grist : (grist * 0.9144) / 0.45359237
  const tex = 1e6 / metresPerKg
  const areaCm2 = tex / 1e5 / YARN_DENSITY
  return Math.sqrt((4 * areaCm2) / Math.PI) * 10
}

/** Ends per cm or inch, as millimetres between ends. */
const spacingMm = (perUnit: number, units: Units) => (units === 'metric' ? 10 : 25.4) / perUnit

/**
 * Thread sizes and pick spacing for the 3D preview, from the yarn library (each thread's colour picks its yarn) and
 * the calculator's sett. Threads without a grist get a standard size.
 */
export function clothLook(d: Draft, yarns: Yarn[], density: Density): ClothLook {
  const endGap = spacingMm(density.sett, density.units)
  let fromYarns = false
  const size = (color: string) => {
    const grist = yarnFor(yarns, color)?.grist
    if (!grist || grist <= 0) return DEFAULT_SIZE
    fromYarns = true
    return yarnDiameter(grist, density.units) / endGap
  }
  const texture = (color: string): Texture => {
    const t = yarnFor(yarns, color)?.texture
    if (t && t !== 'smooth') fromYarns = true
    return t ?? 'smooth'
  }
  return {
    warpSize: d.warpColors.map(size),
    weftSize: d.weftColors.map(size),
    pickSpacing: spacingMm(density.ppi, density.units) / endGap,
    warpTexture: d.warpColors.map(texture),
    weftTexture: d.weftColors.map(texture),
    fromYarns,
  }
}

/** The sett and picks from the warp calculator's saved settings, or its defaults. */
export function loadDensity(): Density {
  const fallback = defaultCalcInput('metric')
  try {
    const saved = JSON.parse(localStorage.getItem('weave-calculator') ?? 'null') as {
      units?: Units
      texts?: { sett?: string; ppi?: string }
    } | null
    const units: Units = saved?.units === 'imperial' ? 'imperial' : 'metric'
    const defaults = defaultCalcInput(units)
    const num = (text: string | undefined, def: number) => {
      const n = Number(text)
      return text && Number.isFinite(n) && n > 0 ? n : def
    }
    return { units, sett: num(saved?.texts?.sett, defaults.sett), ppi: num(saved?.texts?.ppi, defaults.ppi) }
  } catch {
    return { units: 'metric', sett: fallback.sett, ppi: fallback.ppi }
  }
}
