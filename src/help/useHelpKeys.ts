import { useEffect, useRef } from 'react'

/** The help topic for an element: the nearest `data-help` around it. */
const topicOf = (el: Element | null) => el?.closest<HTMLElement>('[data-help]')?.dataset.help ?? null

/**
 * F1 opens help at the topic for what's being worked on: the part of the page with keyboard focus, or else the one
 * under the pointer (each marked with `data-help="topic"`). "?" opens the keyboard shortcuts, unless typing.
 */
export function useHelpKeys(open: (topic: string | null) => void, enabled = true) {
  const pointer = useRef<Element | null>(null)
  const latest = useRef(open)
  latest.current = open
  useEffect(() => {
    if (!enabled) return
    const move = (e: PointerEvent) => {
      pointer.current = e.target as Element
    }
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')
      if (e.key === 'F1') {
        e.preventDefault()
        const focused =
          document.activeElement && document.activeElement !== document.body ? document.activeElement : null
        latest.current(topicOf(focused) ?? topicOf(pointer.current))
      } else if (e.key === '?' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Not from inside a dialog: it might be in the middle of something.
        if ((e.target as HTMLElement | null)?.closest('[role="dialog"]')) return
        e.preventDefault()
        latest.current('shortcuts')
      }
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('keydown', key)
    }
  }, [enabled])
}
