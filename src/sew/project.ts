import { packJson, unpackJson } from '../share'
import { DESIGNS, designById } from './designs'
import { type Extra, extraPiece, parseExtras } from './extras'
import {
  type ChartId,
  cleanMeasurements,
  type Figure,
  type Measurements,
  SIZE_CHARTS,
  sizeByName,
  type Units,
  WOMENS,
} from './measurements'
import {
  type Allowances,
  type Body,
  cleanOptions,
  DEFAULT_ALLOWANCES,
  type Design,
  defaultOptions,
  type Options,
  type Piece,
} from './pattern'

/** A sewing project: the design and its options, who it's for, and how the pattern is drawn. */
export interface Project {
  design: string
  options: Options
  /** A standard size, or your own measurements. */
  sizing: 'standard' | 'custom'
  chart: ChartId
  size: string
  /** Your measurements (kept when you switch to a standard size and back). */
  custom: Measurements
  figure: Figure
  /** More standard sizes drawn nested round this one. */
  nested: string[]
  allowances: Allowances
  units: Units
  /** Your own pieces, added to the design's. */
  extras: Extra[]
}

export function newProject(designId = DESIGNS[0].id, from?: Project): Project {
  const d = designById(designId) ?? DESIGNS[0]
  const base = WOMENS[3]
  return {
    design: d.id,
    options: defaultOptions(d),
    sizing: from?.sizing ?? 'standard',
    chart: from?.chart ?? 'womens',
    size: from?.size ?? base.name,
    custom: from?.custom ?? { ...base.m },
    figure: from?.figure ?? base.figure,
    nested: [],
    allowances: { ...DEFAULT_ALLOWANCES, ...d.allowances },
    units: from?.units ?? 'cm',
    extras: [],
  }
}

/** A project read back from storage or a file, checked and filled in. */
export function parseProject(x: unknown): Project | null {
  if (!x || typeof x !== 'object') return null
  const p = x as Record<string, unknown>
  const d = typeof p.design === 'string' ? designById(p.design) : undefined
  if (!d) return null
  const base = newProject(d.id)
  const chart: ChartId = p.chart === 'mens' ? 'mens' : 'womens'
  const size =
    typeof p.size === 'string' && SIZE_CHARTS[chart].some((s) => s.name === p.size)
      ? p.size
      : SIZE_CHARTS[chart][chart === 'mens' ? 2 : 3].name
  const a = (p.allowances ?? {}) as Partial<Allowances>
  const n = (v: unknown, lo: number, hi: number, dflt: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : dflt
  return {
    design: d.id,
    options: cleanOptions(d, p.options),
    sizing: p.sizing === 'custom' ? 'custom' : 'standard',
    chart,
    size,
    custom: cleanMeasurements(p.custom, base.custom),
    figure: p.figure === 'chest' ? 'chest' : 'bust',
    nested: Array.isArray(p.nested)
      ? p.nested.filter((s): s is string => typeof s === 'string' && SIZE_CHARTS[chart].some((z) => z.name === s))
      : [],
    allowances: {
      include: typeof a.include === 'boolean' ? a.include : true,
      seam: n(a.seam, 0, 5, base.allowances.seam),
      hem: n(a.hem, 0, 10, base.allowances.hem),
    },
    units: p.units === 'in' ? 'in' : 'cm',
    extras: parseExtras(p.extras),
  }
}

export const designOf = (p: Project): Design => designById(p.design) ?? DESIGNS[0]

/** The body the pattern is drafted for. */
export function bodyOf(p: Project): Body {
  if (p.sizing === 'custom') return { m: p.custom, figure: p.figure }
  const s = sizeByName(p.size) ?? WOMENS[3]
  return { m: s.m, figure: s.figure }
}

/** What to call the size on the pattern: "UK 12", or "Made to measure". */
export const sizeName = (p: Project) => (p.sizing === 'custom' ? 'Made to measure' : p.size)

/** The pattern's pieces, drafted. */
export const piecesOf = (p: Project): Piece[] => [
  ...designOf(p).draft(bodyOf(p), p.options),
  ...p.extras.map(extraPiece),
]

/** The nested sizes' pieces, by size, with the main one's for comparison. */
export function nestedPieces(p: Project): { name: string; pieces: Piece[] }[] {
  const d = designOf(p)
  if (!d.measurements.length) return []
  return p.nested
    .filter((n) => p.sizing === 'custom' || n !== p.size)
    .map((n) => sizeByName(n))
    .filter((s) => s !== undefined)
    .map((s) => ({ name: s.name, pieces: d.draft({ m: s.m, figure: s.figure }, p.options) }))
}

/** Share links: `?project=…`, the project packed small. */
export const PROJECT_KEY = 'project'
export const SEW_URL = 'https://steves165.github.io/weave-patterner/sew/'

export async function encodeProject(name: string, p: Project): Promise<string> {
  return packJson({ name, project: p })
}

export async function decodeProject(data: string): Promise<{ name: string; project: Project }> {
  const x = (await unpackJson(data, 'project')) as { name?: unknown; project?: unknown }
  const project = parseProject(x?.project)
  if (!project) throw new Error('The project link is damaged or incomplete')
  return { name: typeof x.name === 'string' ? x.name : 'Shared pattern', project }
}

export const projectUrl = async (name: string, p: Project) =>
  `${SEW_URL}?${PROJECT_KEY}=${await encodeProject(name, p)}`
