import { type RefObject, useEffect, useState } from 'react'

interface Props {
  /** The positioned draft container the bands are drawn in. */
  container: RefObject<HTMLDivElement | null>
  /** The drawdown grid, which defines the columns and rows. */
  drawdown: RefObject<HTMLDivElement | null>
  cellSize: number
  ends: number
  picks: number
  /** Maps a drawn column to its end number (0-based), for end-1-on-the-right display. */
  endAt: (column: number) => number
}

interface Spot {
  column: number | null
  row: number | null
}

/**
 * Highlights the column and row under the mouse across the threading, drawdown and treadling, with a label
 * naming the end and pick. Mouse and pen only: on touch it would just get in the way.
 */
export function Crosshair({ container, drawdown, cellSize, ends, picks, endAt }: Props) {
  const [spot, setSpot] = useState<Spot>({ column: null, row: null })
  const pitch = cellSize + 1

  useEffect(() => {
    const box = container.current
    if (!box) return
    const move = (e: PointerEvent) => {
      const dd = drawdown.current
      if (e.pointerType === 'touch' || !dd) return
      const r = dd.getBoundingClientRect()
      const column = Math.floor((e.clientX - r.left - 1) / pitch)
      const row = Math.floor((e.clientY - r.top - 1) / pitch)
      setSpot({
        column: column >= 0 && column < ends ? column : null,
        row: row >= 0 && row < picks ? row : null,
      })
    }
    const leave = () => setSpot({ column: null, row: null })
    box.addEventListener('pointermove', move)
    box.addEventListener('pointerleave', leave)
    return () => {
      box.removeEventListener('pointermove', move)
      box.removeEventListener('pointerleave', leave)
    }
  }, [container, drawdown, pitch, ends, picks])

  const dd = drawdown.current
  if (!dd || (spot.column === null && spot.row === null)) return null
  const left = dd.offsetLeft + 1 + (spot.column ?? 0) * pitch
  const top = dd.offsetTop + 1 + (spot.row ?? 0) * pitch
  const parts = [
    spot.column !== null ? `End ${endAt(spot.column) + 1}` : null,
    spot.row !== null ? `Pick ${spot.row + 1}` : null,
  ].filter(Boolean)

  return (
    <>
      {spot.column !== null && (
        <div
          className="crosshair"
          data-testid="crosshair-column"
          style={{ left, top: 0, width: cellSize, height: dd.offsetTop + dd.offsetHeight }}
        />
      )}
      {spot.row !== null && (
        <div
          className="crosshair"
          data-testid="crosshair-row"
          style={{
            left: dd.offsetLeft,
            top,
            height: cellSize,
            width: (container.current?.scrollWidth ?? 0) - dd.offsetLeft,
          }}
        />
      )}
      {/* Just above and to the right of the hovered cell, like a tooltip. */}
      <div
        className="crosshair-label"
        data-testid="crosshair-label"
        style={{
          left: (spot.column !== null ? left : dd.offsetLeft) + cellSize + 6,
          top: Math.max(0, (spot.row !== null ? top : dd.offsetTop) - 20),
        }}
      >
        {parts.join(' · ')}
      </div>
    </>
  )
}
