import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CloseIcon from '@mui/icons-material/Close'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import { AppBar, Box, Button, Dialog, IconButton, Paper, Stack, Toolbar, Tooltip, Typography } from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MONO_FONT } from '../theme'
import { castOn, isRightSide, type KnitChart, rowsOf } from './chart'
import { writtenRows } from './instructions'
import { drawChart } from './render'

const KEY = 'knit-progress'

/** Where you've got to: the row (0-based) and how many times you've been through the chart. */
export interface Progress {
  row: number
  repeat: number
}

/** Reads where you got to with a pattern, by name. */
export function loadProgress(name: string, rows: number): Progress {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    const p = all?.[name]
    if (p && Number.isInteger(p.row) && Number.isInteger(p.repeat))
      return { row: Math.max(0, Math.min(rows - 1, p.row)), repeat: Math.max(1, p.repeat) }
  } catch {
    // start at the beginning
  }
  return { row: 0, repeat: 1 }
}

function saveProgress(name: string, p: Progress) {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    localStorage.setItem(KEY, JSON.stringify({ ...all, [name]: p }))
  } catch {
    // not remembered
  }
}

/** One step on: the next row, or round to row 1 of the next repeat. One step back likewise. */
export function step(p: Progress, rows: number, by: 1 | -1): Progress {
  const row = p.row + by
  if (row >= rows) return { row: 0, repeat: p.repeat + 1 }
  if (row < 0) return p.repeat > 1 ? { row: rows - 1, repeat: p.repeat - 1 } : p
  return { ...p, row }
}

/** The chart, with every row but the one being knitted faded back and that row outlined. */
function ChartWithRow({ chart, row }: { chart: KnitChart; row: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const rows = rowsOf(chart)
    const cell = Math.max(8, Math.min(26, Math.floor(640 / Math.max(chart.stitch[0].length, rows))))
    drawChart(ctx, chart, { cell, cellH: cell, legend: false })
    const margin = cell * 2
    const width = ctx.canvas.width - margin * 2
    const top = margin + (rows - 1 - row) * cell
    ctx.fillStyle = 'rgba(255, 255, 255, 0.62)'
    ctx.fillRect(margin, margin, width, top - margin)
    ctx.fillRect(margin, top + cell, width, rows * cell - (top - margin) - cell)
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--wp-accent').trim() || '#00796b'
    ctx.lineWidth = 3
    ctx.strokeRect(margin - 1.5, top - 1.5, width + 3, cell + 3)
  }, [chart, row])
  return (
    <canvas
      ref={ref}
      role="img"
      aria-label={`The chart, with row ${row + 1} highlighted`}
      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 12 }}
    />
  )
}

interface Props {
  open: boolean
  chart: KnitChart
  name: string
  onClose: () => void
}

/**
 * Knitting mode: follow the chart a row at a time while knitting. The row being worked is highlighted on the chart,
 * with its written instruction large, which way to read it and the stitches you'll have after it. A counter keeps
 * track of repeats, and your place is remembered for each pattern.
 */
export function KnittingMode({ open, chart, name, onClose }: Props) {
  const rows = rowsOf(chart)
  const written = useMemo(() => writtenRows(chart), [chart])
  const [progress, setProgress] = useState<Progress>(() => loadProgress(name, rows))
  useEffect(() => {
    if (open) setProgress(loadProgress(name, rows))
  }, [open, name, rows])
  const go = (by: 1 | -1) =>
    setProgress((p) => {
      const next = step(p, rows, by)
      saveProgress(name, next)
      return next
    })
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('button') && (e.key === ' ' || e.key === 'Enter')) return
      if (['ArrowRight', 'ArrowUp', ' ', 'PageDown'].includes(e.key)) {
        e.preventDefault()
        go(1)
      } else if (['ArrowLeft', 'ArrowDown', 'PageUp'].includes(e.key)) {
        e.preventDefault()
        go(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const r = Math.min(progress.row, rows - 1)
  const w = written[r]
  const next = written[(r + 1) % rows]
  const round = chart.mode === 'round'
  const after = (() => {
    let n = castOn(chart)
    for (let i = 0; i <= r; i++) if (written[i].stitches !== null) n = written[i].stitches as number
    return n
  })()
  const done = (progress.repeat - 1) * rows + r

  return (
    <Dialog open={open} onClose={onClose} fullScreen aria-labelledby="knitting-title">
      <AppBar position="static">
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" aria-label="Close knitting mode" onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <Typography id="knitting-title" variant="h2" sx={{ fontSize: 19, flex: 1, minWidth: 0 }} noWrap>
            Knitting: {name}
          </Typography>
          <Tooltip title="Back to row 1 of the first repeat" describeChild>
            <Button
              color="inherit"
              startIcon={<RestartAltIcon />}
              onClick={() => {
                const start = { row: 0, repeat: 1 }
                saveProgress(name, start)
                setProgress(start)
              }}
            >
              Start again
            </Button>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ flex: 1, minHeight: 0, gap: { xs: 2, md: 3 }, p: { xs: 2, md: 3 }, bgcolor: 'background.default' }}
      >
        <Box
          sx={{
            flex: { md: '1 1 50%' },
            minHeight: 0,
            maxHeight: { xs: '38vh', md: 'none' },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChartWithRow chart={chart} row={r} />
        </Box>
        <Stack sx={{ flex: { md: '1 1 50%' }, gap: 2, minWidth: 0, justifyContent: 'center' }}>
          <Paper variant="outlined" sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: '24px' }} data-testid="knitting-row">
            <Typography color="text.secondary" sx={{ fontWeight: 600 }}>
              {w.label}
              {w.side ? ` · ${w.side === 'RS' ? 'right side' : 'wrong side'}` : ''} · read the chart{' '}
              {isRightSide(chart, r) ? 'right to left' : 'left to right'}
            </Typography>
            <Typography
              component="p"
              sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 600, lineHeight: 1.3, my: 1.5 }}
              data-testid="knitting-instruction"
            >
              {w.text}.
            </Typography>
            <Typography color="text.secondary">
              You'll have{' '}
              <Box component="span" sx={{ fontFamily: MONO_FONT, color: 'text.primary', fontWeight: 500 }}>
                {after}
              </Box>{' '}
              stitches after this {round ? 'round' : 'row'}.
            </Typography>
          </Paper>
          <Typography color="text.secondary" variant="body2">
            Next: {next.label}
            {next.side ? ` (${next.side})` : ''}: {next.text}.
          </Typography>
          <Stack direction="row" sx={{ gap: 1.5 }}>
            <Button
              size="large"
              variant="outlined"
              color="inherit"
              startIcon={<ArrowBackIcon />}
              onClick={() => go(-1)}
              disabled={progress.row === 0 && progress.repeat === 1}
              sx={{ minHeight: 56, flex: 1 }}
            >
              Back a {round ? 'round' : 'row'}
            </Button>
            <Button
              size="large"
              variant="contained"
              disableElevation
              endIcon={<ArrowForwardIcon />}
              onClick={() => go(1)}
              sx={{ minHeight: 56, flex: 2 }}
            >
              {round ? 'Round' : 'Row'} done
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" data-testid="knitting-count">
            Repeat {progress.repeat} of the chart · {done} {round ? 'rounds' : 'rows'} knitted so far. Arrow keys and
            Space move too.
          </Typography>
        </Stack>
      </Stack>
    </Dialog>
  )
}
