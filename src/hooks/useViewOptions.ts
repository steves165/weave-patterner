import { useEffect, useState } from 'react'

export interface ViewOptions {
  /** Number ends right to left, with end 1 on the right (common in US drafts). */
  endOneRight: boolean
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
}

export const DEFAULT_VIEW: ViewOptions = {
  endOneRight: false,
  numbers: false,
  ruler: 4,
  fabric: false,
  sinkingShed: false,
  threadingBelow: false,
}
const KEY = 'weave-view'

function load(): ViewOptions {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Record<string, unknown> | null
    const view = { ...DEFAULT_VIEW }
    for (const k of Object.keys(DEFAULT_VIEW) as (keyof ViewOptions)[]) {
      const v = saved?.[k]
      // Keep only values of the right type (and a sensible ruler), so old or edited storage can't break the view.
      if (typeof v === typeof DEFAULT_VIEW[k] && (k !== 'ruler' || (Number.isInteger(v) && (v as number) >= 0)))
        (view as Record<string, unknown>)[k] = v
    }
    return view
  } catch {
    return DEFAULT_VIEW
  }
}

/** Display preferences, remembered in this browser. */
export function useViewOptions() {
  const [view, setView] = useState(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(view))
    } catch {
      // preferences just won't be remembered
    }
  }, [view])
  return [view, (patch: Partial<ViewOptions>) => setView((v) => ({ ...v, ...patch }))] as const
}
