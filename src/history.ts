/** Undo/redo history of immutable values. */
export interface History<T> {
  past: T[]
  present: T
  future: T[]
}

/** Oldest steps are dropped beyond this many. */
export const HISTORY_LIMIT = 200

export const createHistory = <T>(present: T): History<T> => ({ past: [], present, future: [] })

/**
 * Records `next` as a new step. With `merge`, it replaces the current step instead, so a whole drag-paint
 * stroke undoes in one go.
 */
export function record<T>(h: History<T>, next: T, merge = false): History<T> {
  if (Object.is(next, h.present)) return h
  if (merge && h.past.length > 0) return { ...h, present: next, future: [] }
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] }
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }
}
