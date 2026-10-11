import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import { Box, Button, IconButton, Stack, TextField, Tooltip } from '@mui/material'
import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from 'react'
import { type ColorRun, expandRuns, moveRun } from '../colors'
import { ColourInput } from './ColourInput'

interface Props {
  runs: ColorRun[]
  /** A change to the sequence; `key` names the kind of change, so typing in one field is one undo step. */
  onChange: (runs: ColorRun[], key: string) => void
  /** Short labels, for the sidebar. */
  dense?: boolean
  /** Names the list and its stripes, as "Warp stripe 2". */
  label?: string
}

/**
 * A stripe sequence to edit: each stripe's colour and how many threads, in order. Drag a stripe by its handle to move
 * it (mouse or touch), or focus the handle and use the arrow keys.
 */
export function StripeEditor({ runs, onChange, dense = false, label = 'Stripe' }: Props) {
  const rows = useRef<(HTMLDivElement | null)[]>([])
  const handles = useRef<(HTMLButtonElement | null)[]>([])
  const [dragging, setDragging] = useState<number | null>(null)
  const drag = useRef<{ index: number; pointer: number } | null>(null)
  // After a move by keyboard, the moved stripe's handle keeps the focus.
  const [focusAt, setFocusAt] = useState<number | null>(null)
  useEffect(() => {
    if (focusAt === null) return
    handles.current[focusAt]?.focus()
    setFocusAt(null)
  }, [focusAt])

  const setRun = (i: number, patch: Partial<ColorRun>, key: string) =>
    onChange(
      runs.map((r, j) => (j === i ? { ...r, ...patch } : r)),
      key,
    )
  const move = (from: number, to: number) => onChange(moveRun(runs, from, to), 'move')

  const onPointerDown = (e: PointerEvent, i: number) => {
    if (e.button !== 0) return
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
    drag.current = { index: i, pointer: e.pointerId }
    setDragging(i)
  }
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current
    if (!d) return
    // The stripe whose row the pointer is over now.
    let to = d.index
    for (const [k, row] of rows.current.entries()) {
      const r = row?.getBoundingClientRect()
      if (r && e.clientY >= r.top && e.clientY <= r.bottom) to = k
    }
    if (to !== d.index) {
      move(d.index, to)
      d.index = to
      setDragging(to)
    }
  }
  const endDrag = () => {
    drag.current = null
    setDragging(null)
  }
  const onKey = (e: KeyboardEvent, i: number) => {
    const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : null
    if (to === null || to < 0 || to >= runs.length) return
    e.preventDefault()
    move(i, to)
    setFocusAt(to)
  }

  const preview = (() => {
    try {
      return expandRuns(runs)
    } catch {
      return []
    }
  })()

  return (
    <Stack sx={{ gap: 1 }}>
      <Stack sx={{ gap: 1 }} role="list" aria-label={`${label} sequence`}>
        {runs.map((r, i) => (
          <Stack
            // biome-ignore lint/suspicious/noArrayIndexKey: stripes are positional and edited in place
            key={i}
            ref={(el: HTMLDivElement | null) => {
              rows.current[i] = el
            }}
            direction="row"
            role="listitem"
            data-stripe={i + 1}
            sx={{
              gap: 1,
              alignItems: 'center',
              borderRadius: 2,
              bgcolor: dragging === i ? 'var(--wp-hover)' : undefined,
              boxShadow: dragging === i ? 2 : undefined,
            }}
          >
            <Tooltip title="Drag to move, or use the arrow keys" describeChild>
              <IconButton
                ref={(el: HTMLButtonElement | null) => {
                  handles.current[i] = el
                }}
                size="small"
                aria-label={`Move ${label.toLowerCase()} ${i + 1}`}
                aria-describedby={undefined}
                disabled={runs.length < 2}
                onPointerDown={(e) => onPointerDown(e, i)}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={(e) => onKey(e, i)}
                sx={{ cursor: dragging === i ? 'grabbing' : 'grab', touchAction: 'none' }}
              >
                <DragIndicatorIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <ColourInput
              label={`${label} ${i + 1} colour`}
              value={r.color}
              onChange={(c) => setRun(i, { color: c }, `color:${i}`)}
            />
            <TextField
              size="small"
              type="number"
              label={dense ? 'Threads' : `${label} ${i + 1} threads`}
              value={r.count}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value))
                if (Number.isFinite(n) && n >= 1 && n <= 1000) setRun(i, { count: n }, `count:${i}`)
              }}
              slotProps={{ htmlInput: { min: 1, max: 1000, 'aria-label': `${label} ${i + 1} threads` } }}
              sx={{ width: dense ? 96 : 150 }}
            />
            <IconButton
              aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
              disabled={runs.length <= 1}
              onClick={() =>
                onChange(
                  runs.filter((_, j) => j !== i),
                  'remove',
                )
              }
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => onChange([...runs, { color: runs[runs.length - 1]?.color ?? '#000000', count: 1 }], 'add')}
        >
          Add stripe
        </Button>
        <Box
          data-testid="stripe-preview"
          role="img"
          aria-label={`Preview of the ${label.toLowerCase()}s`}
          sx={{
            display: 'flex',
            flex: 1,
            height: 18,
            border: 1,
            borderColor: 'divider',
            overflow: 'hidden',
            borderRadius: 1,
          }}
        >
          {Array.from({ length: Math.min(64, Math.max(preview.length, 1) * 4) }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: purely positional preview
            <Box key={i} sx={{ flex: 1, bgcolor: preview[i % preview.length] ?? 'transparent' }} />
          ))}
        </Box>
      </Stack>
    </Stack>
  )
}
