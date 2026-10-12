import { Typography } from '@mui/material'
import { type ReactNode, useCallback, useState } from 'react'
import { createPortal, flushSync } from 'react-dom'

type Craft = 'weave' | 'knit' | 'sew'

/** Which app this is, from the class its page sets on <html> (main.tsx and index.html). */
const craftOfPage = (): Craft => {
  const c = document.documentElement.classList
  return c.contains('knit') ? 'knit' : c.contains('sew') ? 'sew' : 'weave'
}

// The same pictures are in each page's index.html, shown before the app starts: keep them alike.
const PICTURES: Record<Craft, ReactNode> = {
  weave: (
    <div className="loom" aria-hidden="true">
      <div className="loom-warp loom-warp-a" />
      <div className="loom-warp loom-warp-b" />
      <div className="loom-cloth" />
      <div className="loom-reed" />
      <div className="loom-shuttle" />
      <div className="loom-beam" />
      <div className="loom-post loom-post-left" />
      <div className="loom-post loom-post-right" />
    </div>
  ),
  knit: (
    <div className="knitting" aria-hidden="true">
      <div className="knitting-fabric" />
      <div className="knitting-needle knitting-needle-left" />
      <div className="knitting-needle knitting-needle-right" />
      <div className="knitting-ball" />
    </div>
  ),
  sew: (
    <div className="sewing" aria-hidden="true">
      <div className="sewing-cloth" />
      <div className="sewing-stitches" />
      <div className="sewing-needle" />
      <div className="sewing-arm" />
      <div className="sewing-pillar" />
      <div className="sewing-bed" />
      <div className="sewing-wheel" />
    </div>
  ),
}

/**
 * The app's craft in motion over the page while something slow happens (a big pattern being drawn, the 3D view
 * loading): a loom weaving, needles knitting or a sewing machine stitching. It's made of plain boxes that only move
 * and fade, so the browser keeps it running even while the page is busy drawing. It fades in after a moment, so
 * quick waits never flash it.
 */
export function LoomLoader({ label = 'Loading…' }: { label?: string }) {
  return createPortal(
    <div className="loom-loader" role="status" aria-live="polite">
      <div className="loom-card">
        {PICTURES[craftOfPage()]}
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </div>
    </div>,
    document.body,
  )
}

/** Drafts with more squares than this take long enough to draw that the loader shows while they do. */
export const BIG_DRAFT = 20_000

/**
 * Shows the loader while slow work runs: it goes on screen (and starts moving) first, then the work and the drawing
 * it causes happen, then it goes. Returns the loader to render, and `busy(label, work)` to run work behind it.
 */
export function useBusy(): [ReactNode, (label: string, work: () => void) => void] {
  const [label, setLabel] = useState<string | null>(null)
  const busy = useCallback((text: string, work: () => void) => {
    flushSync(() => setLabel(text))
    // Two frames on, the loader has been painted and its animation is running on its own.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        try {
          flushSync(work)
        } finally {
          setLabel(null)
        }
      }),
    )
  }, [])
  const loader = label === null ? null : <LoomLoader label={label} />
  return [loader, busy]
}
