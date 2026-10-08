import { useEffect, useRef } from 'react'
import { type CurrentProject, saveCurrent } from '../current'

/**
 * Keeps the current pattern in localStorage. Writes are batched while drawing (a drag can change many cells a
 * second) and flushed when the page is hidden or closed.
 */
export function useRememberCurrent(project: CurrentProject) {
  const latest = useRef(project)
  latest.current = project
  const { name, draft, baseline } = project

  useEffect(() => {
    const timer = setTimeout(() => saveCurrent({ name, draft, baseline }), 300)
    return () => clearTimeout(timer)
  }, [name, draft, baseline])

  useEffect(() => {
    const flush = () => saveCurrent(latest.current)
    const onVisibility = () => document.visibilityState === 'hidden' && flush()
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
}
