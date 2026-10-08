/** Display settings, remembered in this browser between visits. */
export interface ViewOptions {
  /** Number ends right to left, with end 1 on the right (common in US drafts). */
  endOneRight: boolean
  /** Fill threading boxes in their warp colour and treadling boxes in their weft colour. */
  colorBoxes: boolean
  /** Show shaft/treadle numbers in filled cells instead of plain black squares. */
  numbers: boolean
  /** Ruler tick every this many threads; 0 hides the rulers. */
  ruler: number
  /** Draw the drawdown as shaded threads, like cloth. */
  fabric: boolean
  /** Show the tie-up as the shafts that sink (countermarch looms) instead of those that rise. */
  sinkingShed: boolean
  /** Put the threading and tie-up below the drawdown (Scandinavian layout). */
  threadingBelow: boolean
  /** Size of a grid square in pixels. */
  cellSize: number
  /** Highlight floats longer than `floatLimit` threads. */
  highlightFloats: boolean
  floatLimit: number
  /** Whether the settings panel is open; null follows the screen size (open on desktop, folded on phones). */
  settingsOpen: boolean | null
}

export const CELL_MIN = 6
export const CELL_MAX = 24
export const CELL_DEFAULT = Math.round(CELL_MIN + 0.75 * (CELL_MAX - CELL_MIN))

export const DEFAULT_VIEW: ViewOptions = {
  endOneRight: false,
  colorBoxes: true,
  numbers: false,
  ruler: 4,
  fabric: false,
  sinkingShed: false,
  threadingBelow: false,
  cellSize: CELL_DEFAULT,
  highlightFloats: false,
  floatLimit: 7,
  settingsOpen: null,
}

const isBool = (v: unknown) => typeof v === 'boolean'
const intIn = (min: number, max: number) => (v: unknown) =>
  Number.isInteger(v) && (v as number) >= min && (v as number) <= max

const VALID: { [K in keyof ViewOptions]: (v: unknown) => boolean } = {
  endOneRight: isBool,
  colorBoxes: isBool,
  numbers: isBool,
  ruler: intIn(0, 50),
  fabric: isBool,
  sinkingShed: isBool,
  threadingBelow: isBool,
  cellSize: intIn(CELL_MIN, CELL_MAX),
  highlightFloats: isBool,
  floatLimit: intIn(1, 99),
  settingsOpen: (v) => v === null || isBool(v),
}

/** Reads saved settings, keeping only valid values so old or hand-edited storage can't break the view. */
export function parseViewOptions(saved: unknown): ViewOptions {
  const view = { ...DEFAULT_VIEW }
  if (!saved || typeof saved !== 'object') return view
  for (const k of Object.keys(VALID) as (keyof ViewOptions)[]) {
    const v = (saved as Record<string, unknown>)[k]
    if (VALID[k](v)) (view as Record<string, unknown>)[k] = v
  }
  return view
}
