import { useCallback, useEffect, useRef, useState } from 'react'
import { createHistory, record, redo as redoStep, undo as undoStep } from '../history'
import type { Draft } from '../weave'

export interface UpdateOptions {
  /** Fold this change into the previous step (later cells of one drag stroke). */
  merge?: boolean
  /** Consecutive changes with the same key fold into one step (e.g. dragging around a colour picker). */
  key?: string
}

/**
 * The current draft with undo/redo, plus the "baseline" Reset returns to (the draft as last started, loaded or
 * saved). Ctrl/Cmd+Z undoes and Ctrl/Cmd+Shift+Z or Ctrl+Y redoes, except while typing in a text field.
 */
export function useDraftHistory(initial: () => Draft) {
  const [hist, setHist] = useState(() => createHistory(initial()))
  const [baseline, setBaseline] = useState(hist.present)
  const lastKey = useRef<string | null>(null)

  const update = useCallback((fn: (d: Draft) => Draft, opts: UpdateOptions = {}) => {
    // Decide merging outside the state updater: React may run updaters twice in development.
    const merge = Boolean(opts.merge) || (opts.key !== undefined && opts.key === lastKey.current)
    if (!opts.merge) lastKey.current = opts.key ?? null
    setHist((h) => record(h, fn(h.present), merge))
  }, [])

  /** Starts a new document: clears undo history and makes `d` the baseline. */
  const reset = useCallback((d: Draft) => {
    lastKey.current = null
    setHist(createHistory(d))
    setBaseline(d)
  }, [])

  const undo = useCallback(() => {
    lastKey.current = null
    setHist(undoStep)
  }, [])
  const redo = useCallback(() => {
    lastKey.current = null
    setHist(redoStep)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable]')
      if (typing || !(e.ctrlKey || e.metaKey) || e.altKey) return
      const key = e.key.toLowerCase()
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  return {
    draft: hist.present,
    baseline,
    update,
    reset,
    undo,
    redo,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
    /** Marks the current draft as saved, so Reset returns here, without losing undo history. */
    markBaseline: () => setBaseline(hist.present),
  }
}
