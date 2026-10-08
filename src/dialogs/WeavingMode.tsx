import CloseIcon from '@mui/icons-material/Close'
import ReplayIcon from '@mui/icons-material/Replay'
import SkipNextIcon from '@mui/icons-material/SkipNext'
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious'
import {
  AppBar,
  Box,
  Button,
  Dialog,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Typography,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { layerMap, pickLayers } from '../layers'
import { isDirectTieup } from '../liftplan'
import { computeDrawdown, type Draft } from '../weave'
import { loadProgress, type Progress, pickInfo, saveProgress, step } from '../weaving'

interface Props {
  open: boolean
  name: string
  draft: Draft
  onClose: () => void
}

/** How many upcoming picks to list under the current one. */
const LOOKAHEAD = 4

/** Small drawdown with the current pick outlined, so the weaver can see where they are in the pattern. */
function PickMap({ draft, pick }: { draft: Draft; pick: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const dd = useMemo(() => computeDrawdown(draft), [draft])
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    const scale = 4
    ctx.canvas.width = draft.ends * scale
    ctx.canvas.height = draft.picks * scale
    for (let p = 0; p < draft.picks; p++)
      for (let e = 0; e < draft.ends; e++) {
        ctx.fillStyle = dd[p][e] ? draft.warpColors[e] : draft.weftColors[p]
        ctx.fillRect(e * scale, p * scale, scale, scale)
      }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(0, 0, ctx.canvas.width, pick * scale)
    ctx.strokeStyle = '#ff9800'
    ctx.lineWidth = 2
    ctx.strokeRect(1, pick * scale, ctx.canvas.width - 2, scale)
  }, [draft, dd, pick])
  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ width: '100%', maxWidth: 320, imageRendering: 'pixelated', borderRadius: 4, border: '1px solid #888' }}
    />
  )
}

const LAYER_TEXT = {
  top: 'Top layer',
  bottom: 'Bottom layer (top layer lifted out of the way)',
  both: 'Both layers: they swap places across the width',
} as const

/**
 * Full-screen, pick-by-pick guide for use at the loom: which treadles to press (or shafts to lift) and which
 * weft to throw. Big targets for a tablet, keyboard and foot-pedal friendly (arrows, Space, PageUp/PageDown),
 * and progress is remembered per pattern.
 */
export function WeavingMode({ open, name, draft, onClose }: Props) {
  const [progress, setProgress] = useState<Progress>({ pick: 0, repeat: 0 })
  const [view, setView] = useState<'treadles' | 'shafts'>('treadles')
  // For double cloth: which layer each pick weaves.
  const layers = useMemo(
    () => (open ? pickLayers(layerMap(draft, 'face'), layerMap(draft, 'back')) : []),
    [open, draft],
  )
  const [goTo, setGoTo] = useState('')

  useEffect(() => {
    if (open) setProgress(loadProgress(name, draft.picks))
  }, [open, name, draft.picks])

  // A lift plan's treadles are just its shafts, so start in the shafts view for those.
  const liftplan = isDirectTieup(draft)
  useEffect(() => {
    if (open) setView(liftplan ? 'shafts' : 'treadles')
  }, [open, liftplan])

  const move = (delta: 1 | -1) =>
    setProgress((p) => {
      const next = step(p, draft.picks, delta)
      saveProgress(name, next)
      return next
    })
  const jump = (next: Progress) => {
    saveProgress(name, next)
    setProgress(next)
  }

  // Keyboard and page-turner pedals (which send PageUp/PageDown or arrow keys).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault()
        move(1)
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) {
        e.preventDefault()
        move(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Keep a tablet's screen on while weaving, where supported.
  useEffect(() => {
    if (!open || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    navigator.wakeLock
      .request('screen')
      .then((l) => {
        lock = l
      })
      .catch(() => {})
    return () => {
      lock?.release().catch(() => {})
    }
  }, [open])

  if (!open) return null
  const { pick, repeat } = progress
  const info = pickInfo(draft, pick)
  const marked = view === 'treadles' ? info.treadles : info.shafts
  const count = view === 'treadles' ? draft.treadles : draft.shafts
  const noun = view === 'treadles' ? 'treadle' : 'shaft'
  const instruction =
    marked.length === 0
      ? `No ${noun}s for this pick`
      : view === 'treadles'
        ? `Press treadle${marked.length > 1 ? 's' : ''} ${marked.join(' + ')}`
        : `Lift shaft${marked.length > 1 ? 's' : ''} ${marked.join(', ')}`
  const upcoming = Array.from({ length: LOOKAHEAD }, (_, i) => (pick + 1 + i) % draft.picks).map((p) => {
    const next = pickInfo(draft, p)
    const nums = view === 'treadles' ? next.treadles : next.shafts
    return { p, label: nums.length ? nums.join('+') : '–', color: next.color }
  })

  return (
    <Dialog fullScreen open={open} onClose={onClose} aria-labelledby="weaving-title">
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton edge="start" aria-label="Close weaving mode" onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <Typography id="weaving-title" variant="h6" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
            Weaving: {name}
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view}
            onChange={(_, v) => v && setView(v)}
            aria-label="Show treadles or shafts"
          >
            <ToggleButton value="treadles">Treadles</ToggleButton>
            <ToggleButton value="shafts">Shafts</ToggleButton>
          </ToggleButtonGroup>
        </Toolbar>
      </AppBar>

      <Stack sx={{ flexGrow: 1, alignItems: 'center', gap: 3, p: { xs: 2, sm: 4 }, overflow: 'auto' }}>
        <Box sx={{ textAlign: 'center' }} aria-live="polite">
          <Typography variant="h3" component="p" data-testid="pick-number">
            Pick {pick + 1}{' '}
            <Typography component="span" variant="h5" color="text.secondary">
              of {draft.picks}
            </Typography>
          </Typography>
          <Typography color="text.secondary" data-testid="repeat-number">
            Repeat {repeat + 1}
          </Typography>
          <Typography variant="h5" sx={{ mt: 1 }} data-testid="instruction">
            {instruction}
          </Typography>
          {layers[pick] && (
            <Typography color="text.secondary" data-testid="pick-layer">
              {LAYER_TEXT[layers[pick]]}
            </Typography>
          )}
        </Box>

        <Stack
          direction="row"
          sx={{ gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}
          role="list"
          aria-label={`${noun}s`}
        >
          {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
            const on = marked.includes(n)
            return (
              <Box
                key={n}
                role="listitem"
                aria-label={`${noun} ${n}${on ? ', use' : ''}`}
                data-on={on}
                sx={{
                  width: { xs: 44, sm: 64 },
                  height: { xs: 64, sm: 96 },
                  borderRadius: 2,
                  border: 2,
                  borderColor: on ? 'primary.main' : 'divider',
                  bgcolor: on ? 'primary.main' : 'transparent',
                  color: on ? 'primary.contrastText' : 'text.secondary',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: { xs: '1.25rem', sm: '1.75rem' },
                  fontWeight: on ? 700 : 400,
                }}
              >
                {n}
              </Box>
            )
          })}
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{ width: 40, height: 40, borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: info.color }}
            aria-hidden
          />
          <Typography data-testid="weft-colour">Weft {info.color}</Typography>
        </Stack>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Coming up
          </Typography>
          <Stack direction="row" sx={{ gap: 2, justifyContent: 'center' }} data-testid="upcoming">
            {upcoming.map((u) => (
              <Stack key={u.p} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {u.p + 1}
                </Typography>
                <Typography>{u.label}</Typography>
                <Box sx={{ width: 16, height: 6, bgcolor: u.color, border: 1, borderColor: 'divider' }} />
              </Stack>
            ))}
          </Stack>
        </Box>

        <PickMap draft={draft} pick={pick} />

        <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <TextField
            size="small"
            label="Go to pick"
            type="number"
            value={goTo}
            onChange={(e) => setGoTo(e.target.value)}
            onKeyDown={(e) => {
              const n = Number(goTo)
              if (e.key === 'Enter' && Number.isInteger(n) && n >= 1 && n <= draft.picks) {
                jump({ pick: n - 1, repeat })
                setGoTo('')
              }
            }}
            slotProps={{ htmlInput: { min: 1, max: draft.picks } }}
            sx={{ width: 120 }}
          />
          <Button startIcon={<ReplayIcon />} onClick={() => jump({ pick: 0, repeat: 0 })}>
            Start over
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" sx={{ gap: 1, p: 1, pb: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}>
        <Button
          variant="outlined"
          size="large"
          startIcon={<SkipPreviousIcon />}
          onClick={() => move(-1)}
          disabled={pick === 0 && repeat === 0}
          sx={{ flex: 1, py: 2 }}
        >
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          endIcon={<SkipNextIcon />}
          onClick={() => move(1)}
          sx={{ flex: 2, py: 2 }}
        >
          Next pick
        </Button>
      </Stack>
    </Dialog>
  )
}
