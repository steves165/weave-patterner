/**
 * On touch screens, every menu and popover closes when it's swiped down from its top (its handle, App.css), as a
 * bottom sheet does: on a phone a long menu fills the screen and leaves little to tap outside it. A swipe that starts
 * with the menu scrolled down scrolls it as usual.
 */
const PAPER = '.MuiPopover-paper'
/** How far down (px) a swipe must go to close, or a quick flick (px per ms) of at least FLICK_MIN px. */
const CLOSE_AT = 80
const FLICK = 0.5
const FLICK_MIN = 30

interface Drag {
  paper: HTMLElement
  x0: number
  y0: number
  t0: number
  dy: number
  /** Decided to be a swipe down (rather than a tap, or a scroll sideways or up). */
  active: boolean
}

/** Whether anything from `el` up to the menu is scrolled down, so the swipe should scroll it back up instead. */
function scrolledDown(el: Element | null, paper: HTMLElement): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (e.scrollTop > 0) return true
    if (e === paper) break
  }
  return false
}

/** Lets menus and popovers be swiped down to close, on the whole page. Returns a function that stops it. */
export function swipeMenusToClose(doc: Document = document): () => void {
  let drag: Drag | null = null

  const settle = (paper: HTMLElement, close: boolean) => {
    if (close) {
      // As if Escape was pressed: MUI's Modal closes the menu, and the menu fades out where it is.
      paper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      return
    }
    paper.style.transition = 'translate 0.2s ease-out'
    paper.style.translate = ''
  }

  const start = (e: TouchEvent) => {
    drag = null
    if (e.touches.length !== 1 || !(e.target instanceof Element)) return
    const paper = e.target.closest<HTMLElement>(PAPER)
    if (!paper || scrolledDown(e.target, paper)) return
    const t = e.touches[0]
    drag = { paper, x0: t.clientX, y0: t.clientY, t0: e.timeStamp, dy: 0, active: false }
  }

  const move = (e: TouchEvent) => {
    if (!drag) return
    const t = e.touches[0]
    const dx = t.clientX - drag.x0
    const dy = t.clientY - drag.y0
    if (!drag.active) {
      if (dy > 8 && dy > Math.abs(dx)) drag.active = true
      else if (dy < -4 || Math.abs(dx) > 8) drag = null
      if (!drag?.active) return
    }
    // The menu follows the finger (the CSS translate, which MUI's own transform animations leave alone).
    e.preventDefault()
    drag.dy = Math.max(0, dy)
    drag.paper.style.transition = 'none'
    drag.paper.style.translate = `0 ${drag.dy}px`
  }

  const end = (e: TouchEvent) => {
    const d = drag
    drag = null
    if (!d?.active) return
    const speed = d.dy / Math.max(1, e.timeStamp - d.t0)
    settle(d.paper, d.dy >= CLOSE_AT || (d.dy >= FLICK_MIN && speed >= FLICK))
  }

  const cancel = () => {
    if (drag?.active) settle(drag.paper, false)
    drag = null
  }

  doc.addEventListener('touchstart', start, { passive: true })
  doc.addEventListener('touchmove', move, { passive: false })
  doc.addEventListener('touchend', end)
  doc.addEventListener('touchcancel', cancel)
  return () => {
    doc.removeEventListener('touchstart', start)
    doc.removeEventListener('touchmove', move)
    doc.removeEventListener('touchend', end)
    doc.removeEventListener('touchcancel', cancel)
  }
}
