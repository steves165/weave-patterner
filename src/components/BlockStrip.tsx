import { type PointerEvent, useRef, useState } from 'react'
import { blockLetter, blockTitle, type EndBlock } from '../endBlocks'

interface Props {
  ends: number
  blocks: EndBlock[]
  cellSize: number
  /** Drawn column -> end index (and back): columns run backwards when end 1 is on the right. */
  endAt: (column: number) => number
  /** Marks ends `from` to `to` as a new block. */
  onAdd: (from: number, to: number) => void
  /** Opens block i, to name it, save it to the block store or swap a saved block in. */
  onOpen: (i: number) => void
}

/**
 * The blocks of ends, labelled above their columns: "A Saved block 1" over ends 1–4 and so on. Dragging along the
 * strip marks a new block; clicking a block opens it.
 */
export function BlockStrip({ ends, blocks, cellSize, endAt, onAdd, onOpen }: Props) {
  const strip = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ start: number; at: number } | null>(null)
  // Columns are a cell wide with a 1px line between, inside a 1px border, matching the grids below.
  const columnAt = (x: number) => {
    const left = strip.current?.getBoundingClientRect().left ?? 0
    return Math.max(0, Math.min(ends - 1, Math.floor((x - left - 1) / (cellSize + 1))))
  }
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const c = columnAt(e.clientX)
    setDrag({ start: c, at: c })
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const c = columnAt(e.clientX)
    if (c !== drag.at) setDrag({ ...drag, at: c })
  }
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    setDrag(null)
    // A drag across two or more ends marks a block; a plain click doesn't, so it's hard to make one by accident.
    if (e.type === 'pointerup' && drag.at !== drag.start) onAdd(endAt(drag.start), endAt(drag.at))
  }
  const span = (from: number, to: number) => {
    const [a, b] = [endAt(from), endAt(to)].sort((x, y) => x - y)
    return `${a + 1} / ${b + 2}`
  }

  return (
    <div
      ref={strip}
      className="block-strip"
      data-help="blocks"
      data-testid="block-strip"
      title={blocks.length ? undefined : 'Drag along here to mark a block of ends'}
      style={{ gridTemplateColumns: `repeat(${ends}, var(--cell))` }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      {blocks.length === 0 && !drag && (
        <span className="block-hint" style={{ gridColumn: `1 / ${ends + 1}` }} aria-hidden="true">
          Drag here to mark blocks of ends
        </span>
      )}
      {blocks.map((b, i) => (
        <button
          key={`${b.from}-${b.to}`}
          type="button"
          className="block-label"
          data-block={blockLetter(i)}
          style={{ gridColumn: span(b.from, b.to) }}
          title={`Block ${blockTitle(blocks, i)}${b.name ? `: ${b.name}` : ''}`}
          aria-label={`Block ${blockTitle(blocks, i)}${b.name ? `, ${b.name}` : ''}`}
          onClick={() => onOpen(i)}
        >
          <strong>{blockLetter(i)}</strong>
          {b.name && <span>{b.name}</span>}
        </button>
      ))}
      {drag && (
        <span
          className="block-drag"
          style={{ gridColumn: `${Math.min(drag.start, drag.at) + 1} / ${Math.max(drag.start, drag.at) + 2}` }}
        >
          {Math.abs(drag.at - drag.start) + 1}
        </span>
      )}
    </div>
  )
}
