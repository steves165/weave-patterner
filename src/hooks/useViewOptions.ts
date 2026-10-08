import { useEffect, useState } from 'react'
import { parseViewOptions, type ViewOptions } from '../viewOptions'

export type { ViewOptions } from '../viewOptions'

const KEY = 'weave-view'

function load(): ViewOptions {
  try {
    return parseViewOptions(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return parseViewOptions(null)
  }
}

/** Display settings, remembered in this browser. */
export function useViewOptions() {
  const [view, setView] = useState(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(view))
    } catch {
      // settings just won't be remembered
    }
  }, [view])
  return [view, (patch: Partial<ViewOptions>) => setView((v) => ({ ...v, ...patch }))] as const
}
