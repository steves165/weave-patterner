import type { Design } from '../pattern'
import { APRON, BUCKET_HAT, CUSHION, TOTE } from './accessories'
import { CIRCLE_SKIRT, GATHERED_SKIRT, SKIRT } from './skirts'
import { BODICE_BLOCK, SHIFT_DRESS, TANK, TSHIRT } from './tops'
import { TROUSERS } from './trousers'

/** Every design, in the order the app lists them. */
export const DESIGNS: Design[] = [
  TSHIRT,
  TANK,
  SHIFT_DRESS,
  SKIRT,
  CIRCLE_SKIRT,
  GATHERED_SKIRT,
  TROUSERS,
  TOTE,
  APRON,
  CUSHION,
  BUCKET_HAT,
  BODICE_BLOCK,
]

export const designById = (id: string): Design | undefined => DESIGNS.find((d) => d.id === id)
