import { useEffect, useState } from 'react'

export interface ViewOptions {
  /** Number ends right to left, with end 1 on the right (common in US drafts). */
  endOneRight: boolean
  /** Show shaft/treadle numbers in filled cells instead of plain black squares. */
  numbers: boolean
  /** Ruler tick every this many threads; 0 hides the rulers. */
  ruler: number
}

export const DEFAULT_VIEW: ViewOptions = { endOneRight: false, numbers: false, ruler: 4 }
const KEY = 'weave-view'

function load(): ViewOptions {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<ViewOptions> | null
    return {
      endOneRight: typeof saved?.endOneRight === 'boolean' ? saved.endOneRight : DEFAULT_VIEW.endOneRight,
      numbers: typeof saved?.numbers === 'boolean' ? saved.numbers : DEFAULT_VIEW.numbers,
      ruler:
        Number.isInteger(saved?.ruler) && (saved?.ruler ?? -1) >= 0 ? (saved?.ruler as number) : DEFAULT_VIEW.ruler,
    }
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
