import { useEffect, useState } from 'react'
import { type SavedPattern, weaveStore } from '../storage'

/** Saved patterns marked as presets, read again each time `active` turns on (a dialog opening). */
export function useSavedPresets(active: boolean): SavedPattern[] {
  const [presets, setPresets] = useState<SavedPattern[]>([])
  useEffect(() => {
    if (!active) return
    let current = true
    weaveStore
      .listPatterns()
      .then((all) => current && setPresets(all.filter((p) => p.preset)))
      .catch(() => current && setPresets([]))
    return () => {
      current = false
    }
  }, [active])
  return presets
}
