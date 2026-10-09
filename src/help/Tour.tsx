import CloseIcon from '@mui/icons-material/Close'
import ExploreIcon from '@mui/icons-material/Explore'
import { Box, Button, IconButton, Paper, Portal, Stack, Typography } from '@mui/material'
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface TourStep {
  /** Where to point: CSS selectors, comma-separated; the first one on screen is used. None: a card in the middle. */
  target?: string
  title: string
  /** What it is and how to use it. **bold** works. */
  text: string
}

/** The first of the selectors that's on screen. */
function find(target: string | undefined): HTMLElement | null {
  if (!target) return null
  // Commas inside quoted attribute values (aria-label="Show the drawdown, or…") don't separate selectors.
  for (const sel of target.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/)) {
    for (const el of document.querySelectorAll<HTMLElement>(sel.trim())) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el
    }
  }
  return null
}

const bold = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const m = /^\*\*(.+)\*\*$/.exec(part)
    // biome-ignore lint/suspicious/noArrayIndexKey: pieces of one string, in order
    return m ? <strong key={i}>{m[1]}</strong> : <Fragment key={i}>{part}</Fragment>
  })

const TOUR_KEY = 'wp-tour-seen'

/** Whether this app's tour has been taken or turned down on this device. */
export function tourSeen(app: string): boolean {
  try {
    return Boolean(JSON.parse(localStorage.getItem(TOUR_KEY) ?? '{}')[app])
  } catch {
    return true
  }
}

export function markTourSeen(app: string) {
  try {
    const seen = JSON.parse(localStorage.getItem(TOUR_KEY) ?? '{}')
    localStorage.setItem(TOUR_KEY, JSON.stringify({ ...seen, [app]: true }))
  } catch {
    // not remembered: it'll be offered again
  }
}

/**
 * A guided tour: each step spotlights a part of the screen (the rest dimmed) with a card saying what it is and how
 * to use it. Steps whose part isn't on screen (a phone has no sidebar, say) are left out. Next and Back, or the
 * arrow keys; Escape ends it.
 */
export function Tour({ open, steps, onClose }: { open: boolean; steps: TourStep[]; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const card = useRef<HTMLDivElement>(null)
  // Only the steps whose part is on screen now.
  const [shown, setShown] = useState<TourStep[]>([])
  useEffect(() => {
    if (!open) return
    setShown(steps.filter((s) => !s.target || find(s.target)))
    setIndex(0)
  }, [open, steps])
  const step = shown[index]

  const measure = useCallback(() => {
    const el = find(step?.target)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step])
  useLayoutEffect(() => {
    if (!open || !step) return
    const el = find(step.target)
    el?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior })
    measure()
    card.current?.focus()
    const tick = setInterval(measure, 300)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearInterval(tick)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, step, measure])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, shown.length - 1))
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
      else return
      e.preventDefault()
      e.stopPropagation()
    }
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  }, [open, onClose, shown.length])

  if (!open || !step) return null
  const last = index === shown.length - 1
  // The card goes below the spotlight if there's room, else above, else in the middle.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const width = Math.min(380, vw - 32)
  const pad = 8
  let pos: { left: number; top: number }
  if (!rect) pos = { left: (vw - width) / 2, top: vh / 2 - 120 }
  else {
    const left = Math.max(16, Math.min(vw - width - 16, rect.left + rect.width / 2 - width / 2))
    if (rect.bottom + pad + 230 < vh) pos = { left, top: rect.bottom + pad + 10 }
    else if (rect.top - pad - 240 > 0) pos = { left, top: rect.top - pad - 240 }
    else pos = { left, top: Math.max(16, vh - 260) }
  }
  return (
    <Portal>
      <Box sx={{ position: 'fixed', inset: 0, zIndex: 1500 }} data-testid="tour">
        {/* The spotlight: a clear hole over the part being shown, the rest dimmed. */}
        <Box
          aria-hidden
          sx={{
            position: 'fixed',
            borderRadius: '14px',
            transition: 'all 220ms ease',
            boxShadow: '0 0 0 9999px rgba(10, 10, 20, 0.55)',
            outline: rect ? '3px solid var(--wp-accent)' : 'none',
            ...(rect
              ? {
                  left: rect.left - pad,
                  top: rect.top - pad,
                  width: rect.width + pad * 2,
                  height: rect.height + pad * 2,
                }
              : { left: '50%', top: '50%', width: 0, height: 0 }),
          }}
        />
        <Paper
          ref={card}
          role="dialog"
          aria-labelledby="tour-title"
          aria-describedby="tour-text"
          tabIndex={-1}
          elevation={8}
          sx={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            width,
            p: 2.5,
            borderRadius: '20px',
            outline: 'none',
            transition: 'top 220ms ease, left 220ms ease',
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }} data-testid="tour-step">
              {index + 1} of {shown.length}
            </Typography>
            <IconButton size="small" aria-label="End the tour" onClick={onClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Typography id="tour-title" variant="h2" sx={{ fontSize: 18, mb: 1 }}>
            {step.title}
          </Typography>
          <Typography id="tour-text" variant="body2" sx={{ lineHeight: 1.6, mb: 2 }}>
            {bold(step.text)}
          </Typography>
          <Stack direction="row" sx={{ gap: 1, justifyContent: 'flex-end' }}>
            {index > 0 && (
              <Button color="inherit" onClick={() => setIndex(index - 1)}>
                Back
              </Button>
            )}
            <Button variant="contained" disableElevation onClick={() => (last ? onClose() : setIndex(index + 1))}>
              {last ? 'Finish' : 'Next'}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Portal>
  )
}

/** On a first visit: an offer to take the tour, which can be turned down (and found again in Help). */
export function TourOffer({
  app,
  text,
  onStart,
  onDismiss,
}: {
  app: string
  text: string
  onStart: () => void
  onDismiss: () => void
}) {
  return (
    <Paper
      role="region"
      aria-label="Welcome"
      elevation={8}
      className="wp-enter"
      sx={{
        position: 'fixed',
        zIndex: 1300,
        left: { xs: 8, sm: 16 },
        bottom: {
          xs: 'calc(84px + env(safe-area-inset-bottom, 0px))',
          sm: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        },
        maxWidth: { xs: 'calc(100vw - 16px)', sm: 420 },
        p: 2.5,
        borderRadius: '20px',
      }}
    >
      <Stack direction="row" sx={{ gap: 1.5, alignItems: 'flex-start' }}>
        <ExploreIcon color="primary" sx={{ mt: 0.25 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            New to {app}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
            {text}
          </Typography>
          <Stack direction="row" sx={{ gap: 1 }}>
            <Button variant="contained" disableElevation onClick={onStart}>
              Take the tour
            </Button>
            <Button color="inherit" onClick={onDismiss}>
              Not now
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  )
}
