import type { Draft } from './weave'
import type { Density } from './yarnGeometry'

/** Ways to show the cloth in 3D: as threads (flat or shaped), or made up into something. */
export type View3D = 'flat' | 'draped' | 'cushion' | 'rolled' | 'sofa' | 'rug' | 'tapestry'

export const VIEWS_3D: { value: View3D; label: string; mockup: boolean }[] = [
  { value: 'flat', label: 'Flat', mockup: false },
  { value: 'draped', label: 'Draped', mockup: false },
  { value: 'cushion', label: 'Cushion', mockup: false },
  { value: 'rolled', label: 'Rolled', mockup: false },
  { value: 'sofa', label: 'On a sofa', mockup: true },
  { value: 'rug', label: 'As a rug', mockup: true },
  { value: 'tapestry', label: 'As a tapestry', mockup: true },
]

export const isMockup = (v: View3D) => VIEWS_3D.find((x) => x.value === v)?.mockup ?? false

/** Real sizes in cm of the things the cloth is shown on. */
export const MOCKUP_SIZES = {
  /** Seat cushion top: across × front to back. */
  sofaCushion: { width: 64, depth: 85 },
  rug: { width: 160, length: 230 },
  tapestry: { width: 100, height: 140 },
}

/**
 * The size in cm of one repeat of the draft, woven at the calculator's sett: so a sofa or rug shows the pattern at
 * its real scale. Ends across over the sett, picks along over the picks per cm (or inch).
 */
export function tileSize(d: Draft, density: Density): { width: number; height: number } {
  const perCm = (n: number) => (density.units === 'metric' ? n : n / 2.54)
  return { width: d.ends / perCm(density.sett), height: d.picks / perCm(density.ppi) }
}

/** How many times one repeat fits across a surface `width` × `height` cm. */
export const repeatsOn = (tile: { width: number; height: number }, width: number, height: number) => ({
  x: width / tile.width,
  y: height / tile.height,
})
